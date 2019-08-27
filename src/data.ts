import * as WebSocket from 'ws';

export interface user {
    userWs: WebSocket;
    character: number; //0: Chết - 1: Đang chờ - 2: Dân - 3: Sói - 4: Bảo vệ - 5: Tiên tri - 6: Phù thủy - 7: Bị nguyền - 8: Người hóa sói
    name: string;
}

export interface dataRoom {
    id: number;
    master: WebSocket;
    user: user[];
    status: number; //0: Đang chờ - 1: Đã vào game - 2: Đã đóng room
}

export enum CHARACTER {
    CHET = 0,
    DANG_CHO = 1,
    DAN = 2,
    SOI = 3,
    BAO_VE = 4,
    TIEN_TRI = 5,
    PHU_THUY = 6,
    BI_NGUYEN = 7,
    HOA_SOI = 8
}

export enum STATUS_GAME {
    DANG_CHO = 0,
    DA_VAO_GAME = 1,
    DA_DONG_GAME = 2
}