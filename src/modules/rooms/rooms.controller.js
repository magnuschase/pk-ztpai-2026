const { toRoomResponse } = require("./rooms.mapper");

function createRoomsController({ roomsService }) {
  async function listRooms(req, res) {
    const rooms = await roomsService.listRooms();
    res.json(rooms.map(toRoomResponse));
  }

  async function getRoomById(req, res) {
    const { id } = req.validated.params;
    const room = await roomsService.getRoomById(id);
    res.json(toRoomResponse(room));
  }

  async function createRoom(req, res) {
    const room = await roomsService.createRoom(req.validated.body);
    res
      .status(201)
      .location(`/api/rooms/${room.id}`)
      .json(toRoomResponse(room));
  }

  return { listRooms, getRoomById, createRoom };
}

module.exports = createRoomsController;
