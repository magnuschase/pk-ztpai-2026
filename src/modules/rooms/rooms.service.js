const { NotFoundError } = require("../../errors");

function createRoomsService({ roomsRepository, buildingsRepository }) {
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

  async function createRoom(input) {
    const building = await buildingsRepository.findById(input.buildingId);
    if (!building) {
      throw new NotFoundError("Building not found", "BUILDING_NOT_FOUND");
    }

    // Duplicate (buildingId, name) is rejected by the UNIQUE constraint -> 409 in errorHandler
    return roomsRepository.create({
      buildingId: input.buildingId,
      name: input.name,
      capacity: input.capacity,
    });
  }

  return { listRooms, getRoomById, createRoom };
}

module.exports = createRoomsService;
