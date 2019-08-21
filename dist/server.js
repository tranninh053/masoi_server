"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const data_1 = require("./data");
const app = express();
//initialize a simple http server
const server = http.createServer(app);
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
let ID_ROOM = 0;
let LIST_ROOM = [];
wss.on('connection', (ws) => {
    let isMasterRoom = false;
    let dataRoom;
    let slSoi;
    let slBaove;
    let slTienTri;
    let slPhuThuy;
    let slBiNguyen;
    let slHoaSoi;
    //Data user
    let userName = '';
    let idRoom = 0;
    let dataUser;
    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
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
                    + '[{"id_room":' + ID_ROOM + ', '
                    + ' "slSoi":' + slSoi + ', '
                    + ' "slBaove":' + slBaove + ', '
                    + ' "slTienTri":' + slTienTri + ', '
                    + ' "slPhuThuy":' + slPhuThuy + ', '
                    + ' "slBiNguyen":' + slBiNguyen + ', '
                    + ' "slHoaSoi":' + slHoaSoi + '}]');
            }
            //Start game
            const startGameRegex = /^start_game\:/;
            if (startGameRegex.test(message)) {
                let indexRoom = getIndexRoom(idRoom);
                setCharacter(indexRoom, slSoi, slBaove, slTienTri, slPhuThuy, slBiNguyen, slHoaSoi);
                sortCharracter(indexRoom);
                ws.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
            }
        }
        else {
            // Join Room
            const joinRoomRegex = /^join_room\:/;
            if (joinRoomRegex.test(message)) {
                message = message.replace(joinRoomRegex, '');
                let data = message.split(",");
                userName = data[0];
                idRoom = Number(data[1]);
                //Check error join room
                let msgError = checkErrorJoinRoom(userName, idRoom);
                if (msgError !== '') {
                    ws.send(msgError);
                }
                else {
                    dataUser = {
                        userWs: ws,
                        character: data_1.CHARACTER.DANG_CHO,
                        name: userName
                    };
                    let indexRoom = getIndexRoom(idRoom);
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
                let idRoom = Number(message);
                let indexRoom = getIndexRoom(idRoom);
                if (indexRoom >= 0) {
                    LIST_ROOM[indexRoom].master.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                    LIST_ROOM[indexRoom].user.forEach(user => {
                        user.userWs.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                    });
                }
            }
        }
    });
    ws.on('close', () => {
        if (isMasterRoom === true) {
            let indexRoom = getIndexRoom(idRoom);
            if (indexRoom >= 0) {
                LIST_ROOM[indexRoom].user.forEach(user => {
                    user.userWs.send('masterRoomOut: Chủ phòng đã thoát game.');
                });
                LIST_ROOM[indexRoom].status = 2;
            }
        }
        else {
            let indexRoom = getIndexRoom(idRoom);
            if (indexRoom >= 0) {
                userOutGame(userName, indexRoom);
                LIST_ROOM[indexRoom].master.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                LIST_ROOM[indexRoom].user.forEach(user => {
                    user.userWs.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                });
            }
        }
    });
});
function checkErrorJoinRoom(userName, idRoom) {
    let indexRoom = getIndexRoom(idRoom);
    let valueReturn = '';
    //Check exist room
    if (indexRoom < 0) {
        valueReturn = 'Error: Không tồn tại mã phòng: ' + idRoom;
    }
    else if (checkExistUserName(userName, indexRoom) === true) {
        //Check exist username
        valueReturn = 'Error: Đã tồn tại tên người chơi "' + userName + '" trong phòng ' + idRoom;
    }
    else if (LIST_ROOM[indexRoom].status === 2) {
        //Check room end game
        valueReturn = 'Error: Room này đã kết thúc game.';
    }
    else if (LIST_ROOM[indexRoom].status === 1) {
        //Check room start game
        valueReturn = 'Error: Room vào trận.';
    }
    return valueReturn;
}
function getIndexRoom(idRoom) {
    for (let index = 0; index < LIST_ROOM.length; index++) {
        const room = LIST_ROOM[index];
        if (room.id === idRoom) {
            return index;
        }
    }
    return -1;
}
function checkExistUserName(userName, indexRoom) {
    let room = LIST_ROOM[indexRoom];
    let valueReturn = false;
    room.user.forEach(user => {
        if (user.name === userName) {
            valueReturn = true;
            return true;
        }
    });
    return valueReturn;
}
function userOutGame(userName, indexRoom) {
    let room = LIST_ROOM[indexRoom];
    let lstUser = [];
    room.user.forEach(user => {
        if (user.name !== userName) {
            let newUser = {
                userWs: user.userWs,
                character: user.character,
                name: user.name
            };
            lstUser.push(newUser);
        }
    });
    LIST_ROOM[indexRoom].user = lstUser;
}
function sortCharracter(indexRoom) {
    let tempSoi = [];
    let tempBaoVe = [];
    let tempTienTri = [];
    let tempPhuThuy = [];
    let tempBiNguyen = [];
    let tempHoaSoi = [];
    let tempDan = [];
    for (let index = 0; index < LIST_ROOM[indexRoom].user.length; index++) {
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.SOI) {
            tempSoi.push(LIST_ROOM[indexRoom].user[index]);
        }
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.BAO_VE) {
            tempBaoVe.push(LIST_ROOM[indexRoom].user[index]);
        }
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.TIEN_TRI) {
            tempTienTri.push(LIST_ROOM[indexRoom].user[index]);
        }
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.PHU_THUY) {
            tempPhuThuy.push(LIST_ROOM[indexRoom].user[index]);
        }
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.BI_NGUYEN) {
            tempBiNguyen.push(LIST_ROOM[indexRoom].user[index]);
        }
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.HOA_SOI) {
            tempHoaSoi.push(LIST_ROOM[indexRoom].user[index]);
        }
        if (LIST_ROOM[indexRoom].user[index].character === data_1.CHARACTER.DAN) {
            tempDan.push(LIST_ROOM[indexRoom].user[index]);
        }
    }
    let tempUser = [];
    tempUser = tempUser.concat(tempSoi);
    tempUser = tempUser.concat(tempBaoVe);
    tempUser = tempUser.concat(tempTienTri);
    tempUser = tempUser.concat(tempPhuThuy);
    tempUser = tempUser.concat(tempBiNguyen);
    tempUser = tempUser.concat(tempHoaSoi);
    tempUser = tempUser.concat(tempDan);
    LIST_ROOM[indexRoom].user = tempUser;
}
function setCharacter(indexRoom, slSoi, slBaove, slTienTri, slPhuThuy, slBiNguyen, slHoaSoi) {
    //Create Soi
    for (let index = 0; index < slSoi; index++) {
        doSetCharacter(indexRoom, data_1.CHARACTER.SOI);
    }
    //Create Bao Ve
    for (let index = 0; index < slBaove; index++) {
        doSetCharacter(indexRoom, data_1.CHARACTER.BAO_VE);
    }
    //Create Tien Tri
    for (let index = 0; index < slTienTri; index++) {
        doSetCharacter(indexRoom, data_1.CHARACTER.TIEN_TRI);
    }
    //Create Phu Thuy
    for (let index = 0; index < slPhuThuy; index++) {
        doSetCharacter(indexRoom, data_1.CHARACTER.PHU_THUY);
    }
    //Create Bi Nguyen
    for (let index = 0; index < slBiNguyen; index++) {
        doSetCharacter(indexRoom, data_1.CHARACTER.BI_NGUYEN);
    }
    //Create Hoa Soi
    for (let index = 0; index < slHoaSoi; index++) {
        doSetCharacter(indexRoom, data_1.CHARACTER.HOA_SOI);
    }
    //Create dan
    for (let index = 0; index < LIST_ROOM[indexRoom].user.length; index++) {
        if (LIST_ROOM[indexRoom].user[index].character <= 1) {
            LIST_ROOM[indexRoom].user[index].character = data_1.CHARACTER.DAN;
            LIST_ROOM[indexRoom].user[index].userWs.send("character:" + data_1.CHARACTER.DAN);
            console.log(LIST_ROOM[indexRoom].user[index].name + " - " + data_1.CHARACTER.DAN);
        }
    }
}
function doSetCharacter(indexRoom, character) {
    if (isFullCharacter(indexRoom) === false) {
        while (true) {
            let indexTemp = Math.floor((Math.random() * LIST_ROOM[indexRoom].user.length));
            if (LIST_ROOM[indexRoom].user[indexTemp].character <= data_1.CHARACTER.DANG_CHO) {
                LIST_ROOM[indexRoom].user[indexTemp].character = character;
                LIST_ROOM[indexRoom].user[indexTemp].userWs.send("character:" + character);
                return;
            }
        }
    }
}
function isFullCharacter(indexRoom) {
    let valueReturn = true;
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
    const { port } = server.address();
    console.log(`Server started on port: ` + server.address().port);
});
//# sourceMappingURL=server.js.map