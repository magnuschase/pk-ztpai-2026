const { Router } = require("express");
const validate = require("../../middleware/validate");
const createReservationsService = require("./reservations.service");
const createReservationsController = require("./reservations.controller");
const {
  createReservationSchema,
  reservationIdParamSchema,
  listReservationsQuerySchema,
} = require("./reservations.schemas");

function createReservationsRouter({
  reservationsRepository,
  roomsRepository,
  runInTransaction,
  now,
}) {
  const router = Router();
  const reservationsService = createReservationsService({
    reservationsRepository,
    roomsRepository,
    runInTransaction,
    now,
  });
  const reservationsController = createReservationsController({ reservationsService });

  router.get(
    "/",
    validate({ query: listReservationsQuerySchema }),
    reservationsController.listReservations,
  );

  router.get(
    "/:id",
    validate({ params: reservationIdParamSchema }),
    reservationsController.getReservationById,
  );

  router.post(
    "/",
    validate({ body: createReservationSchema }),
    reservationsController.createReservation,
  );

  router.patch(
    "/:id/cancel",
    validate({ params: reservationIdParamSchema }),
    reservationsController.cancelReservation,
  );

  return router;
}

module.exports = createReservationsRouter;
