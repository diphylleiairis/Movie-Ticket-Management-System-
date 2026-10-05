export type Movie = {
	slug: string;
	title: string;
	genre: string[];
	label: string;
	minutes: number;
	rating: string;
	image: string;
	description: string;
};

export const movies: Movie[] = [
	{
		slug: "chronicles-of-dust",
		title: "CHRONICLES OF DUST",
		genre: ["Sci-Fi", "Art-house"],
		label: "SCI-FI / ARTHOUSE",
		minutes: 154,
		rating: "PG-13",
		image: "/images/chronicles-of-dust.png",
		description: "In a distant future, humanity has migrated to a dry, harsh desert world known as terminal dust. An academic explorer unearths an ancient stellar artifact that holds the code to terraform the dying planet, igniting a silent corporate war over control of the cosmic code.",
	},
	{
		slug: "echoes-of-the-abyss",
		title: "ECHOES OF THE ABYSS",
		genre: ["Thriller"],
		label: "THRILLER / NOIR",
		minutes: 128,
		rating: "R",
		image: "/images/echoes-of-the-abyss.png",
		description: "A deep-sea researcher follows a mysterious signal to an abandoned station, where the crew's final recordings reveal a secret buried beneath the ocean floor.",
	},
	{
		slug: "midnight-in-kyoto",
		title: "MIDNIGHT IN KYOTO",
		genre: ["Drama"],
		label: "DRAMA / ROMANCE",
		minutes: 114,
		rating: "PG",
		image: "/images/midnight-in-kyoto.png",
		description: "Two strangers meet in Kyoto on the last night of a summer festival and discover that one unexpected evening can change the course of both their lives.",
	},
	{
		slug: "the-last-nocturne",
		title: "THE LAST NOCTURNE",
		genre: ["Art-house"],
		label: "NEO-CLASSICAL",
		minutes: 98,
		rating: "G",
		image: "/images/the-last-nocturne.png",
		description: "An aging pianist returns to the stage for one final performance and revisits the memories behind the composition that defined her career.",
	},
];

export const demoGenres = ["All Genres", ...new Set(movies.flatMap((movie) => movie.genre))];

export const demoMovieListGenres = [
	"Sci-Fi", "Horror", "Action", "Comedy", "Drama", "Romance", "Thriller",
	...demoGenres.filter((genre) => !["All Genres", "Sci-Fi", "Drama", "Thriller"].includes(genre)),
];

// Curated demo collections; live collections will come from the catalog API.
export const demoMovieCollections = {
	trending: ["chronicles-of-dust", "echoes-of-the-abyss"],
	new: ["midnight-in-kyoto", "the-last-nocturne"],
};

export const movieListPath = (genre = "All Genres") =>
	genre === "All Genres" ? "/movie-list" : `/movie-list?genre=${encodeURIComponent(genre)}`;

// Temporary content for the catalog and showtime page until the API is connected.
export const demoFeaturedHero = {
	movie: movies[0],
	label: "FEATURED RELEASE",
	format: "IMAX",
	ratingText: "8.4 RATING",
	description:
		"An epic journey across terminal desert landscapes. A visually arresting sci-fi symphony exploring human survival and ancient stellar relics. Masterfully captured in 70mm.",
	bookButtonLabel: "BOOK TICKETS NOW",
	trailerButtonLabel: "WATCH TRAILER",
};

export const demoShowtimeHeroLabel = "IN THEATERS";

export const demoCinemas = [
	{
		name: "LUMIÈRE PREMIERE",
		district: "QUẬN 1",
		experience: "Dolby Atmos",
		language: "Original language",
		times: ["11:30", "14:15", "17:00", "20:00"],
	},
	{
		name: "LUMIÈRE IMAX",
		district: "QUẬN 3",
		experience: "IMAX Laser",
		language: "Original language",
		times: ["13:00", "16:15", "19:30", "22:45"],
	},
];

export const movieShowtimePath = (movie: Movie) =>
	`/movie-showtime?movie=${encodeURIComponent(movie.slug)}`;

export const demoSeatLayout = {
	rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
	columns: 14,
	bookedSeats: ["D4", "D5", "F10", "F11"],
	ticketPrice: 125000,
	serviceFee: 10000,
};

export const demoConcessions = [
	{
		id: "popcorn", name: "TRUFFLE POPCORN",
		description: "House truffle salt, hand-churned French butter",
		price: 60000, image: "/images/truffle_popcorn.jpg",
	},
	{
		id: "champagne", name: "CHAMPAGNE COMBO",
		description: "Half bottle of Brut, artisanal caviar bites",
		price: 210000, image: "/images/Rupert-Rothschild_Festive-Campaign_01-scaled.jpg",
	},
];

export const demoShowtimeDates = () => Array.from({ length: 5 }, (_, index) => {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + index);
	return date;
});

export const showtimeDateKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function readDemoScreening(params: URLSearchParams) {
	const movie = movies.find((item) => item.slug === params.get("movie"));
	const date = demoShowtimeDates().find((item) => showtimeDateKey(item) === params.get("date"));
	const cinema = demoCinemas.find((_, index) => String(index) === params.get("cinema"));
	const time = params.get("time");
	return movie && date && cinema && time && cinema.times.includes(time)
		? { movie, date, cinema, time }
		: null;
}

export const seatSelectionPath = (movie: Movie, date: Date, cinemaIndex: number, time: string) => {
	const params = new URLSearchParams({
		movie: movie.slug,
		date: showtimeDateKey(date),
		cinema: String(cinemaIndex),
		time,
	});
	return `/seat-selection?${params}`;
};
