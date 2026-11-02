const { toBuildingResponse } = require("./buildings.mapper");
const { toRoomResponse } = require("../rooms/rooms.mapper");

function createBuildingsController({ buildingsService }) {
  async function listBuildings(req, res) {
    const buildings = await buildingsService.listBuildings();
    res.json(buildings.map(toBuildingResponse));
  }

  async function getBuildingById(req, res) {
    const { id } = req.validated.params;
    const building = await buildingsService.getBuildingById(id);
    res.json(toBuildingResponse(building));
  }

  async function listBuildingRooms(req, res) {
    const { id } = req.validated.params;
    const rooms = await buildingsService.listBuildingRooms(id);
    res.json(rooms.map(toRoomResponse));
  }

  async function createBuilding(req, res) {
    const building = await buildingsService.createBuilding(req.validated.body);
    res
      .status(201)
      .location(`/api/buildings/${building.id}`)
      .json(toBuildingResponse(building));
  }

  async function updateBuilding(req, res) {
    const { id } = req.validated.params;
    const building = await buildingsService.updateBuilding(id, req.validated.body);
    res.json(toBuildingResponse(building));
  }

  async function deleteBuilding(req, res) {
    const { id } = req.validated.params;
    await buildingsService.deleteBuilding(id);
    res.status(204).end();
  }

  return {
    listBuildings,
    getBuildingById,
    listBuildingRooms,
    createBuilding,
    updateBuilding,
    deleteBuilding,
  };
}

module.exports = createBuildingsController;
