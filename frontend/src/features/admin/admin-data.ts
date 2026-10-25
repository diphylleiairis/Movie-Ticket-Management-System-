import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { AdminAccessError, getAdminBookings, getAdminOverview, getAdminUsers, getAdminMovies, type AdminMovie, type AdminBooking, type AdminOverview, type AdminPage, type AdminUser } from "../../api/admin-api";

type Snapshot<T> = { data?: T; error?: unknown; loading: boolean };

// Requests belong to the authorized layout, so a tab unmount does not abort a shared prefetch.
export class AdminResource<T> {
	private snapshot: Snapshot<T> = { loading: false };
	private listeners = new Set<() => void>();
	private controller?: AbortController;
	private pending?: Promise<void>;
	private version = 0;
	private loadedAt = 0;
	private fetcher: (signal: AbortSignal) => Promise<T>;
	private denied: (error: AdminAccessError) => void;
	constructor(fetcher: (signal: AbortSignal) => Promise<T>, denied: (error: AdminAccessError) => void) { this.fetcher = fetcher; this.denied = denied; }
	getSnapshot = () => this.snapshot;
	subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
	get observed() { return this.listeners.size > 0; }
	private publish(snapshot: Snapshot<T>) { this.snapshot = snapshot; this.listeners.forEach(listener => listener()); }
	load(force = false): Promise<void> {
		if (this.pending) return this.pending;
		if (!force && this.snapshot.data !== undefined && Date.now() - this.loadedAt < 30_000) return Promise.resolve();
		const version = ++this.version;
		const controller = new AbortController();
		this.controller = controller;
		this.publish({ data: this.snapshot.data, loading: true });
		this.pending = this.fetcher(controller.signal).then(data => {
			if (version !== this.version) return;
			this.loadedAt = Date.now();
			this.publish({ data, loading: false });
		}).catch(error => {
			if (controller.signal.aborted || version !== this.version) return;
			if (error instanceof AdminAccessError) { this.denied(error); return; }
			this.publish({ data: this.snapshot.data, error, loading: false });
		}).finally(() => { if (version === this.version) { this.pending = undefined; this.controller = undefined; } });
		return this.pending;
	}
	update(transform: (data: T) => T) {
		this.cancel();
		this.loadedAt = 0;
		this.publish({ data: this.snapshot.data === undefined ? undefined : transform(this.snapshot.data), loading: false });
	}
	private cancel() { this.version++; this.controller?.abort(); this.controller = undefined; this.pending = undefined; }
	clear() { this.cancel(); this.loadedAt = 0; this.publish({ loading: false }); }
}

export class AdminDataStore {
	private userPages = new Map<string, AdminResource<AdminPage<AdminUser>>>();
	private bookingPages = new Map<number, AdminResource<AdminPage<AdminBooking>>>();
	private reports = new Map<number, AdminResource<AdminOverview>>();
	private moviePages = new Map<string, AdminResource<AdminPage<AdminMovie>>>();
	private onDenied: (error: AdminAccessError) => void;
	constructor(onDenied: (error: AdminAccessError) => void) { this.onDenied = onDenied; }
	deny = (error: AdminAccessError) => { this.clear(); this.onDenied(error); };
	private resource<K, T>(map: Map<K, AdminResource<T>>, key: K, fetcher: (signal: AbortSignal) => Promise<T>) {
		let resource = map.get(key);
		if (!resource) {
			resource = new AdminResource(fetcher, this.deny); map.set(key, resource);
			// Keep only a small working set; never evict an actively displayed page.
			for (const [oldKey, old] of map) {
				if (map.size <= 20) break;
				if (old !== resource && !old.observed) { old.clear(); map.delete(oldKey); }
			}
		}
		return resource;
	}
	users(page: number, query: string) {
		return this.resource(this.userPages, JSON.stringify([page, query]), signal => getAdminUsers(page, query, signal));
	}
	bookings(page: number) { return this.resource(this.bookingPages, page, signal => getAdminBookings(page, signal)); }
	movies(page: number, query: string) { return this.resource(this.moviePages, JSON.stringify([page, query]), signal => getAdminMovies(page, query, signal)); }
	overview(days: number) { return this.resource(this.reports, days, signal => getAdminOverview(days, signal)); }
	prefetch(section: string) {
		if (section === "users") void this.users(0, "").load();
		else if (section === "bookings") void this.bookings(0).load();
		else if (section === "movies") void this.movies(0, "").load();
		else void this.overview(30).load();
	}
	userUpdated(id: string, status: "ACTIVE" | "SUSPENSE") {
		// Cancel older reads before patching every cached search/page, so late results cannot undo the write.
		this.userPages.forEach(resource => resource.update(data => ({ ...data,
			items: data.items.map(user => user.id === id ? { ...user, status } : user) })));
	}
	movieCreated() {
		this.moviePages.forEach(resource => resource.clear());
		this.reports.forEach(resource => resource.clear());
		void this.movies(0, "").load(true);
	}
	clear() {
		// Retain resource identities for React StrictMode's effect cleanup/setup cycle.
		this.userPages.forEach(resource => resource.clear());
		this.bookingPages.forEach(resource => resource.clear());
		this.reports.forEach(resource => resource.clear());
		this.moviePages.forEach(resource => resource.clear());
	}
}

export const AdminDataContext = createContext<AdminDataStore | null>(null);

export function useAdminDataStore() {
	const store = useContext(AdminDataContext);
	if (!store) throw new Error("Admin data requires an authorized Admin layout.");
	return store;
}

export function useAdminResource<T>(resource: AdminResource<T>) {
	const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot);
	useEffect(() => {
		void resource.load(true);
		const refresh = () => { if (document.visibilityState === "visible") void resource.load(true); };
		window.addEventListener("focus", refresh);
		return () => window.removeEventListener("focus", refresh);
	}, [resource]);
	return { ...snapshot, refresh: () => { void resource.load(true); } };
}
