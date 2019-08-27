import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { AddressInfo } from 'net';
import { user, dataRoom, CHARACTER, STATUS_GAME } from './data';

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

let ID_ROOM: number = 0;
let LIST_ROOM: dataRoom[] = [];

wss.on('connection', (ws: WebSocket) => {

    let isMasterRoom: boolean = false;
    let dataRoom: dataRoom
    let slSoi: number;
    let slBaove: number;
    let slTienTri: number;
    let slPhuThuy: number;
    let slBiNguyen: number;
    let slHoaSoi: number;

    //Data user
    let userName: string = '';
    let idRoom: number = 0;
    let dataUser: user;

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {
        // CREATE ROOM
        const createRoomRegex = /^create_room\:/;
        if (createRoomRegex.test(message)) {
            message = message.replace(createRoomRegex, '');
            let data = message.split(",");
            slSoi = Number(data[0]);
            slBaove = Number(data[1]);
            slTienTri = Number(data[2]);
            slPhuThuy = Number(data[3]);
            slBiNguyen = Number(data[4]);
            slHoaSoi = Number(data[5]);
            isMasterRoom = true;

            ID_ROOM++;
            idRoom = ID_ROOM;

            dataRoom = {
                id: ID_ROOM,
                master: ws,
                status: 0,
                user: []
            };
            LIST_ROOM.push(dataRoom);
            ws.send('OK');
        }

        if (isMasterRoom === true) {
            //Update Room
            const updateRoomRegex = /^update_room\:/;
            if (updateRoomRegex.test(message)) {
                message = message.replace(updateRoomRegex, '');
                let data = message.split(",");
                slSoi = Number(data[0]);
                slBaove = Number(data[1]);
                slTienTri = Number(data[2]);
                slPhuThuy = Number(data[3]);
                slBiNguyen = Number(data[4]);
                slHoaSoi = Number(data[5]);
                ws.send('OK');
            }
            
            //Get info room
            const infoRoomRegex = /^info_room\:/;
            if (infoRoomRegex.test(message)) {
                ws.send('info_room:' 
                        + '[{"id_room":'   + ID_ROOM + ', '
                        + ' "slSoi":'      + slSoi + ', '
                        + ' "slBaove":'    + slBaove + ', '
                        + ' "slTienTri":'  + slTienTri + ', '
                        + ' "slPhuThuy":'  + slPhuThuy + ', '
                        + ' "slBiNguyen":' + slBiNguyen + ', '
                        + ' "slHoaSoi":'   + slHoaSoi + '}]');
            }

            //Start game
            const startGameRegex = /^start_game\:/;
            if (startGameRegex.test(message)) {
                let indexRoom = getIndexRoom(idRoom);
                setCharacter(indexRoom, slSoi,slBaove,slTienTri,slPhuThuy,slBiNguyen,slHoaSoi);
                sortCharracter(indexRoom);
                LIST_ROOM[indexRoom].status = 1;
                ws.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
            }

            //End Game
            const endGameRegex = /^end_game\:/;
            if (endGameRegex.test(message)) {
                //message = message.replace(updateRoomRegex, '');
                //let data = message.split(",");
                //slSoi = Number(data[0]);
                ws.send('end_game:');
            }
        } else {
            // Join Room
            const joinRoomRegex = /^join_room\:/;
            if (joinRoomRegex.test(message)) {
                message = message.replace(joinRoomRegex, '');
                let data = message.split(",");
                userName = data[0];
                idRoom = Number(data[1]);
                //Check error join room
                let msgError = checkErrorJoinRoom(userName, idRoom)
                
                if (msgError !== '') {
                    ws.send(msgError);
                } else {
                    dataUser = {
                        userWs: ws,
                        character: CHARACTER.DANG_CHO,
                        name: userName
                    }

                    let indexRoom: number = getIndexRoom(idRoom);

                    LIST_ROOM[indexRoom].user.push(dataUser);

                    LIST_ROOM[indexRoom].master.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));

                    LIST_ROOM[indexRoom].user.forEach(user => {
                        user.userWs.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                    });

                }
            }

            const getListMemberRegex = /^get_list_member\:/;
            if (getListMemberRegex.test(message)) {
                message = message.replace(getListMemberRegex, '');
                let idRoom: number = Number(message);
                let indexRoom: number = getIndexRoom(idRoom);
                if (indexRoom >= 0) {
                    LIST_ROOM[indexRoom].master.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                    LIST_ROOM[indexRoom].user.forEach(user => {
                        user.userWs.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                    });
                }
            }

            const lay_baiRegex = /^lay_bai\:/;
            if (lay_baiRegex.test(message)) {
                message = message.replace(lay_baiRegex, '');
                let data = message.split(",");
                userName = data[0];
                idRoom = Number(data[1]);
                let indexRoom: number = getIndexRoom(idRoom);
                if (indexRoom >= 0) {
                    if (LIST_ROOM[indexRoom].status === STATUS_GAME.DA_VAO_GAME) {
                        let indexUser = LIST_ROOM[indexRoom].user.findIndex(user => user.name === userName);
                        ws.send('character:' + LIST_ROOM[indexRoom].user[indexUser].character);
                    } else {
                        ws.send('Error: Game chưa bắt đầu.');
                    }
                    
                }
            }

        }
    });

    ws.on('close', () => {
        if (isMasterRoom === true) {
            let indexRoom = getIndexRoom(idRoom);
            if (indexRoom >= 0) {
                // LIST_ROOM[indexRoom].user.forEach(user => {
                //     user.userWs.send('masterRoomOut: Chủ phòng đã thoát game.');
                // });
                // LIST_ROOM[indexRoom].status = 2;
            }
        } else {
            let indexRoom = getIndexRoom(idRoom);
            if (indexRoom >= 0 && LIST_ROOM[indexRoom].status === STATUS_GAME.DANG_CHO) {
                userOutGame(userName, indexRoom);
                LIST_ROOM[indexRoom].master.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                LIST_ROOM[indexRoom].user.forEach(user => {
                    user.userWs.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                });
            }
        }
    })
});

function checkErrorJoinRoom(userName: string, idRoom: number): string {
    let indexRoom = getIndexRoom(idRoom);
    let valueReturn: string = '';
    //Check exist room
    if (indexRoom < 0) {
        valueReturn = 'Error: Không tồn tại mã phòng: ' + idRoom;
    } else  if (checkExistUserName(userName, indexRoom) === true) {
        //Check exist username
        valueReturn = 'Error: Đã tồn tại tên người chơi "' + userName + '" trong phòng ' + idRoom;
    } else if (LIST_ROOM[indexRoom].status === 2) {
        //Check room end game
        valueReturn = 'Error: Room này đã kết thúc game.';
    } else if (LIST_ROOM[indexRoom].status === 1) {
        //Check room start game
        valueReturn = 'Error: Room vào trận.';
    }
    return valueReturn;
}

function getIndexRoom(idRoom: number): number {
    for (let index = 0; index < LIST_ROOM.length; index++) {
        const room = LIST_ROOM[index];
        if (room.id === idRoom) {
            return index
        }
    }

    return -1;
}

function checkExistUserName(userName: string, indexRoom: number): boolean {
    let room = LIST_ROOM[indexRoom];
    let valueReturn: boolean = false;
    room.user.forEach(user => {
        if (user.name === userName) {
            valueReturn = true;
            return true;
        }
    });

    return valueReturn;
}

function userOutGame(userName: string, indexRoom: number) {
    let room = LIST_ROOM[indexRoom];
    let lstUser: user[] = []
    room.user.forEach(user => {
        if (user.name !== userName) {
            let newUser: user = {
                userWs: user.userWs,
                character: user.character,
                name: user.name
            }
            lstUser.push(newUser);
        }
    });
    LIST_ROOM[indexRoom].user = lstUser;
}

function sortCharracter(indexRoom: number) {

    let tempSoi: user[] = [];
    let tempBaoVe: user[] = [];
    let tempTienTri: user[] = [];
    let tempPhuThuy: user[] = [];
    let tempBiNguyen: user[] = [];
    let tempHoaSoi: user[] = [];
    let tempDan: user[] = [];
    for (let index = 0; index < LIST_ROOM[indexRoom].user.length; index++) {
        
        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.SOI) {
            tempSoi.push(LIST_ROOM[indexRoom].user[index]);
        }
        
        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.BAO_VE) {
            tempBaoVe.push(LIST_ROOM[indexRoom].user[index]);
        }

        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.TIEN_TRI) {
            tempTienTri.push(LIST_ROOM[indexRoom].user[index]);
        }

        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.PHU_THUY) {
            tempPhuThuy.push(LIST_ROOM[indexRoom].user[index]);
        }

        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.BI_NGUYEN) {
            tempBiNguyen.push(LIST_ROOM[indexRoom].user[index]);
        }

        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.HOA_SOI) {
            tempHoaSoi.push(LIST_ROOM[indexRoom].user[index]);
        }

        if (LIST_ROOM[indexRoom].user[index].character === CHARACTER.DAN) {
            tempDan.push(LIST_ROOM[indexRoom].user[index]);
        }
    }

    
    let tempUser: user[] = [];
    
    tempUser = tempUser.concat(tempSoi);
    tempUser = tempUser.concat(tempBaoVe);
    tempUser = tempUser.concat(tempTienTri);
    tempUser = tempUser.concat(tempPhuThuy);
    tempUser = tempUser.concat(tempBiNguyen);
    tempUser = tempUser.concat(tempHoaSoi);
    tempUser = tempUser.concat(tempDan);

    LIST_ROOM[indexRoom].user = tempUser;
}

function setCharacter(indexRoom: number
                     ,slSoi: number
                     ,slBaove: number
                     ,slTienTri: number
                     ,slPhuThuy: number
                     ,slBiNguyen: number
                     ,slHoaSoi: number) {
    
    //Create Soi
    for (let index = 0; index < slSoi; index++) {
        doSetCharacter(indexRoom, CHARACTER.SOI);
    }
    //Create Bao Ve
    for (let index = 0; index < slBaove; index++) {
        doSetCharacter(indexRoom, CHARACTER.BAO_VE);
    }
    //Create Tien Tri
    for (let index = 0; index < slTienTri; index++) {
        doSetCharacter(indexRoom, CHARACTER.TIEN_TRI);
    }
    //Create Phu Thuy
    for (let index = 0; index < slPhuThuy; index++) {
        doSetCharacter(indexRoom, CHARACTER.PHU_THUY);
    }
    //Create Bi Nguyen
    for (let index = 0; index < slBiNguyen; index++) {
        doSetCharacter(indexRoom, CHARACTER.BI_NGUYEN);
    }
    //Create Hoa Soi
    for (let index = 0; index < slHoaSoi; index++) {
        doSetCharacter(indexRoom, CHARACTER.HOA_SOI);
    }
    //Create dan
    for (let index = 0; index < LIST_ROOM[indexRoom].user.length; index++) {
        if (LIST_ROOM[indexRoom].user[index].character <= 1) {
            LIST_ROOM[indexRoom].user[index].character = CHARACTER.DAN;
            LIST_ROOM[indexRoom].user[index].userWs.send("character:" + CHARACTER.DAN);
            console.log(LIST_ROOM[indexRoom].user[index].name + " - " + CHARACTER.DAN);
        }
    }
}

function doSetCharacter(indexRoom: number, character: number) {
    if (isFullCharacter(indexRoom) === false) {
        while (true) {
            let indexTemp = Math.floor((Math.random()*LIST_ROOM[indexRoom].user.length));
            if (LIST_ROOM[indexRoom].user[indexTemp].character <= CHARACTER.DANG_CHO) {
                LIST_ROOM[indexRoom].user[indexTemp].character = character;
                LIST_ROOM[indexRoom].user[indexTemp].userWs.send("character:" + character);
                return;
            }
        }
    }
}

function isFullCharacter(indexRoom: number): boolean {
    let valueReturn: boolean = true
    for (let index = 0; index < LIST_ROOM[indexRoom].user.length; index++) {
        if (LIST_ROOM[indexRoom].user[index].character <= 1) {
            valueReturn = false;
            break;
        }
    }

    return valueReturn;
}

//start our server
server.listen(process.env.PORT || 8999, () => {
    const { port } = server.address() as AddressInfo;
    
    console.log(`Server started on port: ` + (server.address() as AddressInfo).port);
});
