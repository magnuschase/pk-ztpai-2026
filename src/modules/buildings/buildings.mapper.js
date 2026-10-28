function toBuildingResponse(building) {
  return {
    id: building.id,
    name: building.name,
    address: building.address,
  };
}

module.exports = { toBuildingResponse };
