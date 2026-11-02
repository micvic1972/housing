"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Listing } from "../components/home/listingcard/types";
import styles from "./page.module.css";

export default function ListingMap({
  listings,
  onSelectListing,
}: {
  listings: Listing[];
  onSelectListing: (listingId: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let map: Leaflet.Map | undefined;
    let resizeTimer: number | undefined;

    void import("leaflet")
      .then((L) => {
        const container = element.current;
        if (!active || !container) return;

        const points = listings.flatMap((listing) => {
          const coordinates = listing.location.coordinates;
          return coordinates ? [{ listing, coordinates }] : [];
        });
        if (points.length === 0) return;

        const mapInstance = L.map(container, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        map = mapInstance;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstance);
        mapInstance.on("tileerror", () => {
          if (active) {
            setError(
              "Map tiles could not be loaded. The verified locations remain available in the list.",
            );
          }
        });

        const bounds: Leaflet.LatLngExpression[] = [];
        for (const { listing, coordinates } of points) {
          const position: Leaflet.LatLngExpression = [
            coordinates.latitude,
            coordinates.longitude,
          ];
          bounds.push(position);
          const marker = L.circleMarker(position, {
            radius: 9,
            color: "#ffffff",
            weight: 2,
            fillColor: "#1769aa",
            fillOpacity: 0.95,
          }).addTo(mapInstance);
          marker.on("click", () => onSelectListing(listing.id));

          const popup = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = listing.name;
          const area = document.createElement("p");
          area.textContent = listing.location.area;
          const link = document.createElement("a");
          link.href = `/listings/${encodeURIComponent(listing.id)}`;
          link.textContent = "Open listing";
          popup.append(title, area, link);
          marker.bindPopup(popup);
        }

        if (points.length === 1) {
          const { latitude, longitude } = points[0].coordinates;
          mapInstance.setView([latitude, longitude], 15);
        } else {
          mapInstance.fitBounds(L.latLngBounds(bounds).pad(0.15), {
            maxZoom: 15,
          });
        }
        resizeTimer = window.setTimeout(() => mapInstance.invalidateSize(), 0);
        setError(null);
      })
      .catch(() => {
        if (active) {
          setError(
            "The map could not be initialized. Use the location list instead.",
          );
        }
      });

    return () => {
      active = false;
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
      map?.remove();
    };
  }, [listings, onSelectListing]);

  return (
    <div className={styles.mapFrame}>
      <div
        ref={element}
        className={styles.mapCanvas}
        role="region"
        aria-label="Map of listings with verified coordinates"
      />
      {error ? (
        <p className={styles.mapError} role="alert">
          {error}
        </p>
      ) : null}
      <p className={styles.mapAttribution}>
        Map data © OpenStreetMap contributors
      </p>
    </div>
  );
}
