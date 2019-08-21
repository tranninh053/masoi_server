'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({ server });

wss.on('connection', (ws) => {
  let isMasterRoom = false;
    let dataRoom
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
                ws.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
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
        } else {
            let indexRoom = getIndexRoom(idRoom);
            if (indexRoom >= 0) {
                userOutGame(userName, indexRoom);
                LIST_ROOM[indexRoom].master.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                LIST_ROOM[indexRoom].user.forEach(user => {
                    user.userWs.send('listmember:' + JSON.stringify(LIST_ROOM[indexRoom].user));
                });
            }
            
        }
    })
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 1000);