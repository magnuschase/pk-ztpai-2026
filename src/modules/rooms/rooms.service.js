const { NotFoundError } = require("../../errors");

function createRoomsService({ roomsRepository }) {
  async function listRooms() {
    return roomsRepository.findAll();
  }

  async function getRoomById(id) {
    const room = await roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundError("Room not found", "ROOM_NOT_FOUND");
    }
    return room;
  }

  return { listRooms, getRoomById };
}

module.exports = createRoomsService;
