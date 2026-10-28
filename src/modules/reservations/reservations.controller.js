const { toReservationResponse } = require("./reservations.mapper");

function createReservationsController({ reservationsService }) {
  async function listReservations(req, res) {
    const { roomId } = req.validated.query ?? {};
    const reservations = await reservationsService.listReservations(roomId);
    res.json(reservations.map(toReservationResponse));
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
