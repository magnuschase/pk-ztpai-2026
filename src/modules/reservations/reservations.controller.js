const { toReservationResponse } = require("./reservations.mapper");

function createReservationsController({ reservationsService }) {
  async function listReservations(req, res) {
    const { page, limit, sort, ...filters } = req.validated.query;
    const result = await reservationsService.listReservations({ filters, sort, page, limit });
    res.json({
      data: result.items.map(toReservationResponse),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  async function getReservationById(req, res) {
    const { id } = req.validated.params;
    const reservation = await reservationsService.getReservationById(id);
    res.json(toReservationResponse(reservation));
  }

  async function createReservation(req, res) {
    const reservation = await reservationsService.createReservation(req.validated.body);
    res
      .status(201)
      .location(`/api/reservations/${reservation.id}`)
      .json(toReservationResponse(reservation));
  }

  async function cancelReservation(req, res) {
    const { id } = req.validated.params;
    const reservation = await reservationsService.cancelReservation(id);
    res.json(toReservationResponse(reservation));
  }

  return { listReservations, getReservationById, createReservation, cancelReservation };
}

module.exports = createReservationsController;
