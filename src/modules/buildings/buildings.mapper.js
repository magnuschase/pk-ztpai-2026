function toBuildingResponse(building) {
  return {
    id: building.id,
    name: building.name,
    address: building.address,
    roomsCount: building.roomsCount,
  };
}

module.exports = { toBuildingResponse };
