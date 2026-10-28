const createApp = require("./app");
const RoomsRepository = require("./modules/rooms/rooms.repository.memory");
const ReservationsRepository = require("./modules/reservations/reservations.repository.memory");

const PORT = process.env.PORT || 3000;

const roomsRepository = new RoomsRepository();
const reservationsRepository = new ReservationsRepository();

const app = createApp({ roomsRepository, reservationsRepository });

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
