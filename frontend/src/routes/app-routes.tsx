import { Route, Routes } from "react-router-dom";
import Page from "../cinema-discovery";
import MovieShowtime from "../movie-showtime";
import MovieList from "../features/catalog/movie-list";
import SeatSelection from "../features/booking/seat-selection";
import TicketCheckout from "../features/payment/ticket-checkout";
import AuthLayout from "../features/identity/auth-layout";
import AuthPage from "../features/identity/auth-page";

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<Page />} />
			<Route path="movie-showtime" element={<MovieShowtime />} />
			<Route path="movie-list" element={<MovieList />} />
			<Route path="seat-selection" element={<SeatSelection />} />
			<Route path="ticket-checkout" element={<TicketCheckout />} />
			<Route element={<AuthLayout />}>
				<Route path="login" element={<AuthPage key="login" mode="login" />} />
				<Route path="register" element={<AuthPage key="register" mode="register" />} />
				<Route path="forgot-password" element={<AuthPage key="forgot-password" mode="forgot-password" />} />
			</Route>
			<Route path="*" element={<Page />} />
		</Routes>
	);
}
