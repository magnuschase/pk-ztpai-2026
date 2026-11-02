const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { ROLES } = require("../users/users.roles");
const createBuildingsService = require("./buildings.service");
const createBuildingsController = require("./buildings.controller");
const {
  createBuildingSchema,
  updateBuildingSchema,
  buildingIdParamSchema,
} = require("./buildings.schemas");

function createBuildingsRouter({ buildingsRepository, roomsRepository }) {
  const router = Router();
  const buildingsService = createBuildingsService({ buildingsRepository, roomsRepository });
  const buildingsController = createBuildingsController({ buildingsService });
  // Before validate: a USER gets 403 whatever the body, without learning the validation rules
  const adminOnly = authorize(ROLES.ADMIN);

  // Reading - any logged-in user (authenticate runs for the whole app)
  router.get("/", buildingsController.listBuildings);
  router.get("/:id", validate({ params: buildingIdParamSchema }), buildingsController.getBuildingById);
  router.get(
    "/:id/rooms",
    validate({ params: buildingIdParamSchema }),
    buildingsController.listBuildingRooms,
  );

  // Managing - ADMIN only
  router.post(
    "/",
    adminOnly,
    validate({ body: createBuildingSchema }),
    buildingsController.createBuilding,
  );
  router.patch(
    "/:id",
    adminOnly,
    validate({ params: buildingIdParamSchema, body: updateBuildingSchema }),
    buildingsController.updateBuilding,
  );
  router.delete(
    "/:id",
    adminOnly,
    validate({ params: buildingIdParamSchema }),
    buildingsController.deleteBuilding,
  );

  return router;
}

module.exports = createBuildingsRouter;
