import { Route, Routes, useLocation } from "react-router-dom";
import Page from "../cinema-discovery";
import MovieShowtime from "../movie-showtime";
import MovieList from "../features/catalog/movie-list";
import SeatSelection from "../features/booking/seat-selection";
import TicketCheckout from "../features/payment/ticket-checkout";
import AuthLayout from "../features/identity/auth-layout";
import AuthPage from "../features/identity/auth-page";
import AccountPage from "../features/identity/account-page";
import AdminRoute from "../features/identity/admin-route";
import { AdminOverviewPanel } from "../features/admin/admin-dashboard";
import { AdminUsersPanel, AdminBookingsPanel } from "../features/admin/admin-workspace";
import AdminMoviesPanel from "../features/admin/admin-movies";
import ErrorPage from "../shared/error-page";
import PageErrorBoundary from "../shared/page-error-boundary";

export default function AppRoutes() {
	const location = useLocation();
	return (
		<PageErrorBoundary resetKey={location.pathname + location.search}>
		<Routes>
			<Route path="/" element={<Page />} />
			<Route path="movie-showtime" element={<MovieShowtime />} />
			<Route path="movie-list" element={<MovieList />} />
			<Route path="seat-selection" element={<SeatSelection />} />
			<Route path="ticket-checkout" element={<TicketCheckout />} />
			<Route path="account" element={<AccountPage />} />
			<Route path="admin" element={<AdminRoute />}>
				<Route index element={<AdminOverviewPanel />} />
				<Route path="dashboard" element={<AdminOverviewPanel />} />
				<Route path="users" element={<AdminUsersPanel />} />
				<Route path="bookings" element={<AdminBookingsPanel />} />
				<Route path="movies" element={<AdminMoviesPanel />} />
			</Route>
			<Route element={<AuthLayout />}>
				<Route path="login" element={<AuthPage key="login" mode="login" />} />
				<Route path="register" element={<AuthPage key="register" mode="register" />} />
				<Route path="forgot-password" element={<AuthPage key="forgot-password" mode="forgot-password" />} />
				<Route path="reset-password" element={<AuthPage key="reset-password" mode="reset-password" />} />
			</Route>
			<Route path="error/:status" element={<ErrorPage />} />
			<Route path="404" element={<ErrorPage status={404} />} />
			<Route path="500" element={<ErrorPage status={500} />} />
			<Route path="*" element={<ErrorPage status={404} />} />
		</Routes>
		</PageErrorBoundary>
	);
}
