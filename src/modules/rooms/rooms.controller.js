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

  async function updateRoom(req, res) {
    const { id } = req.validated.params;
    const room = await roomsService.updateRoom(id, req.validated.body);
    res.json(toRoomResponse(room));
  }

  async function deleteRoom(req, res) {
    const { id } = req.validated.params;
    await roomsService.deleteRoom(id);
    res.status(204).end();
  }

  return { listRooms, getRoomById, createRoom, updateRoom, deleteRoom };
}

module.exports = createRoomsController;
