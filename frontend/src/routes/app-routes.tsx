import { Route, Routes, useLocation } from "react-router-dom";
import Page from "../cinema-discovery";
import MovieShowtime from "../movie-showtime";
import MovieList from "../features/catalog/movie-list";
import SeatSelection from "../features/booking/seat-selection";
import TicketCheckout from "../features/payment/ticket-checkout";
import AuthLayout from "../features/identity/auth-layout";
import AuthPage from "../features/identity/auth-page";
import ErrorPage from "../shared/error-page";
import PageErrorBoundary from "../shared/page-error-boundary";

export default function AppRoutes() {
	const location = useLocation();
	return (
		<PageErrorBoundary key={location.pathname + location.search}>
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
			<Route path="error/:status" element={<ErrorPage />} />
			<Route path="404" element={<ErrorPage status={404} />} />
			<Route path="500" element={<ErrorPage status={500} />} />
			<Route path="*" element={<ErrorPage status={404} />} />
		</Routes>
		</PageErrorBoundary>
	);
}
