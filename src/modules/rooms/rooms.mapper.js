function toRoomResponse(room) {
  return {
    id: room.id,
    buildingId: room.buildingId,
    name: room.name,
    capacity: room.capacity,
  };
}

module.exports = { toRoomResponse };
