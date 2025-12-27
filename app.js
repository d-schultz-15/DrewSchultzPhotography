// app.js — Leaflet map portfolio using window.LOCATIONS (from data.js)
// Clicking a marker renders details in the right-side panel (no Leaflet popups).
// Markers are clustered with a count when zoomed out.
// Includes: trip-colored markers + legend + right-panel carousel + full-screen lightbox.
// Mobile fix: after clicking a pin, auto-scroll the detail panel into view.

(() => {
  window.addEventListener("DOMContentLoaded", () => {
    // 1) Create map
    const map = L.map("map", {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true
    }).setView([39.5, -98.35], 4);

    // 2) Add tiles (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // 3) Locations + bounds
    const LOCATIONS = window.LOCATIONS ?? [];
    const bounds = [];

    // --- Trip color map ---
    const TRIP_STYLES = {
      east_coast: { label: "East Coast 2025", color: "#d63b3b" },
      north_south: { label: "North South 2024", color: "#033321" },
      cross_country: { label: "Cross Country 2023", color: "#f2e311" },
      carribean_23: { label: "Carribean Cruise 2023", color: "#F2A007" },
      europe_22: { label: "Europe 2022", color: "#95D66F" },
      las_vegas: { label: "Las Vegas 2022", color: "#6FC0D6" },
      europe_19: {label: "Europe 2019", color: "#D16698" },
      utah_18: {label: "Utah 2018", color: "#3127F5" },
      no_trip: { label: "Not From a Trip", color: "#7b4bd6" },
      default: { label: "Other", color: "#7b4bd6" }
    };

    // Colored circle marker (divIcon)
    function markerIconForTrip(tripKey) {
      const key = tripKey && TRIP_STYLES[tripKey] ? tripKey : "default";
      const color = TRIP_STYLES[key].color;

      return L.divIcon({
        className: "tripMarker",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        html: `
          <div class="tripMarkerDot" style="background:${color}">
            <div class="tripMarkerInner"></div>
          </div>
        `
      });
    }

    // Right-side panel mount
    const detailRoot = document.getElementById("detail");

    // --- Lightbox elements ---
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const lightboxCaption = document.getElementById("lightboxCaption");

    // Guard: if lightbox markup isn't on the page, avoid crashing
    const btnClose = lightbox?.querySelector(".lightboxClose") ?? null;
    const btnPrev = lightbox?.querySelector(".lightboxPrev") ?? null;
    const btnNext = lightbox?.querySelector(".lightboxNext") ?? null;

    // Tracks what's currently open in the lightbox
    let lbLoc = null;
    let lbIdx = 0;

    function getBestSrc(photo) {
      // If you later add { srcLarge: "..."} in data.js, it will use it.
      return photo?.srcLarge || photo?.src || "";
    }

    function openLightbox(loc, startIdx = 0) {
      if (!lightbox || !lightboxImg) return;

      const photos = loc?.photos ?? [];
      if (!photos.length) return;

      lbLoc = loc;
      lbIdx = Math.max(0, Math.min(startIdx, photos.length - 1));

      renderLightbox();
      lightbox.classList.add("isOpen");
      lightbox.setAttribute("aria-hidden", "false");

      // Prevent background scroll
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      if (!lightbox) return;

      lightbox.classList.remove("isOpen");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";

      lbLoc = null;
      lbIdx = 0;
    }

    function renderLightbox() {
      const photos = lbLoc?.photos ?? [];
      const p = photos[lbIdx];
      if (!p || !lightboxImg) return;

      lightboxImg.src = getBestSrc(p);
      lightboxImg.alt = p.caption || lbLoc?.name || "Photo";
      if (lightboxCaption) lightboxCaption.textContent = p.caption || "";
    }

    function lbPrev() {
      const photos = lbLoc?.photos ?? [];
      if (photos.length <= 1) return;
      lbIdx = (lbIdx - 1 + photos.length) % photos.length;
      renderLightbox();
    }

    function lbNext() {
      const photos = lbLoc?.photos ?? [];
      if (photos.length <= 1) return;
      lbIdx = (lbIdx + 1) % photos.length;
      renderLightbox();
    }

    // Lightbox UI events (only if markup exists)
    if (btnClose) btnClose.addEventListener("click", closeLightbox);
    if (btnPrev) btnPrev.addEventListener("click", lbPrev);
    if (btnNext) btnNext.addEventListener("click", lbNext);

    if (lightbox) {
      lightbox.addEventListener("click", (e) => {
        // click on backdrop closes
        if (e.target?.dataset?.close === "1") closeLightbox();
      });
    }

    // Lightbox keyboard support (add ONCE globally)
    window.addEventListener("keydown", (e) => {
      if (!lightbox || !lightbox.classList.contains("isOpen")) return;

      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lbPrev();
      if (e.key === "ArrowRight") lbNext();
    });

    // Helpers
    function escapeHtml(str) {
      return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    // Render right panel
    function renderDetail(loc) {
      if (!detailRoot) return;

      const photos = loc.photos ?? [];
      const multi = photos.length > 1;
      const first = photos[0] ?? { src: "", caption: "" };

      detailRoot.innerHTML = `
        <div class="detailHeader">
          <div class="detailTitle">${escapeHtml(loc.name)}</div>
          ${
            multi
              ? `<div class="detailCount"><span class="detailIdx">1</span> / ${photos.length}</div>`
              : `<div></div>`
          }
        </div>

        ${loc.description ? `<div class="detailDesc">${escapeHtml(loc.description)}</div>` : ``}

        <div class="detailMedia" data-loc="${escapeHtml(loc.id)}" data-index="0">
          <img
            class="detailImg"
            src="${escapeHtml(first.src)}"
            alt="${escapeHtml(first.caption || loc.name)}"
          />

          <button class="detailExpandBtn" type="button" aria-label="View full screen">
            ⤢
          </button>

          ${
            multi
              ? `
                <button class="detailNavBtn detailPrev" type="button" aria-label="Previous photo">‹</button>
                <button class="detailNavBtn detailNext" type="button" aria-label="Next photo">›</button>
              `
              : ``
          }
        </div>

        <div class="detailCaption">${escapeHtml(first.caption || "")}</div>
      `;

      attachDetailHandlers(loc);
    }

    // Attach handlers for expand + (optional) carousel
    function attachDetailHandlers(loc) {
      if (!detailRoot) return;

      const photos = loc.photos ?? [];

      const mediaEl = detailRoot.querySelector(
        `.detailMedia[data-loc="${CSS.escape(loc.id)}"]`
      );
      if (!mediaEl) return;

      // --- Expand works for SINGLE or MULTI ---
      const expandBtn = mediaEl.querySelector(".detailExpandBtn");
      if (expandBtn) {
        expandBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const start = Number(mediaEl.dataset.index || "0");
          openLightbox(loc, start);
        });
      }

      // No carousel controls if only one photo
      if (photos.length <= 1) return;

      const imgEl = mediaEl.querySelector(".detailImg");
      const prevBtn = mediaEl.querySelector(".detailPrev");
      const nextBtn = mediaEl.querySelector(".detailNext");
      const captionEl = detailRoot.querySelector(".detailCaption");
      const idxEl = detailRoot.querySelector(".detailIdx");

      let idx = 0;

      function render() {
        const p = photos[idx];
        if (imgEl) {
          imgEl.src = p.src;
          imgEl.alt = p.caption || loc.name;
        }
        if (captionEl) captionEl.textContent = p.caption || "";
        if (idxEl) idxEl.textContent = String(idx + 1);
        mediaEl.dataset.index = String(idx);
      }

      function prev() {
        idx = (idx - 1 + photos.length) % photos.length;
        render();
      }

      function next() {
        idx = (idx + 1) % photos.length;
        render();
      }

      prevBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        prev();
      });

      nextBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        next();
      });

      // Keyboard arrows for carousel (only when NOT in lightbox)
      const keyHandler = (e) => {
        if (lightbox && lightbox.classList.contains("isOpen")) return;
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      };

      // Remove old handler if exists
      if (detailRoot._keyHandler) window.removeEventListener("keydown", detailRoot._keyHandler);
      detailRoot._keyHandler = keyHandler;
      window.addEventListener("keydown", keyHandler);
    }

    // 4) Cluster group for markers (shows counts when zoomed out)
    const clusters = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 15,

      iconCreateFunction: (cluster) => {
        const children = cluster.getAllChildMarkers();

        // Count trips inside this cluster
        const counts = {};
        for (const m of children) {
          const key = m?.options?.tripKey || "default";
          counts[key] = (counts[key] || 0) + 1;
        }

        // Pick the dominant trip (highest count)
        let winner = "default";
        let best = -1;
        for (const [key, c] of Object.entries(counts)) {
          if (c > best) {
            best = c;
            winner = key;
          }
        }

        const color = (TRIP_STYLES[winner]?.color) || TRIP_STYLES.default.color;
        const size =
          children.length < 10 ? 36 :
          children.length < 50 ? 44 :
          54;

        return L.divIcon({
          html: `
            <div class="tripCluster" style="--clusterColor:${color}; width:${size}px; height:${size}px;">
              <span>${cluster.getChildCount()}</span>
            </div>
          `,
          className: "tripClusterIcon",
          iconSize: L.point(size, size)
        });
      }
    });

    // Add markers
    LOCATIONS.forEach((loc) => {
      if (!loc?.coords || loc.coords.length !== 2) return;

      bounds.push(loc.coords);

      const marker = L.marker(loc.coords, {
        icon: markerIconForTrip(loc.trip),
        tripKey: (loc.trip && TRIP_STYLES[loc.trip]) ? loc.trip : "default"
      });

      marker.on("click", () => {
        const zoom = loc.zoom ?? 12;
        map.flyTo(loc.coords, zoom, { animate: true, duration: 0.9 });
        renderDetail(loc);

        // ✅ MOBILE FIX: auto-scroll the detail panel into view on small screens
        if (window.matchMedia("(max-width: 900px)").matches) {
          setTimeout(() => {
            document.getElementById("detail")?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }, 60);
        }
      });

      clusters.addLayer(marker);
    });

    map.addLayer(clusters);

    // --- Legend (based on TRIP_STYLES) ---
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "tripLegend");

      div.classList.add("collapsed"); // start collapsed

      const entries = Object.entries(TRIP_STYLES).filter(([k]) => k !== "default");

      div.innerHTML = `
        <div class="tripLegendHeader">
          <div class="tripLegendTitle">Legend</div>
          <div class="tripLegendToggle">▸</div>
        </div>

        <div class="tripLegendBody">
          ${entries.map(([, val]) => `
            <div class="tripLegendRow">
              <span class="tripLegendSwatch" style="background:${val.color}"></span>
              <span class="tripLegendText">${val.label}</span>
            </div>
          `).join("")}
        </div>
      `;
      const header = div.querySelector(".tripLegendHeader");

      header.addEventListener("click", () => {
        div.classList.toggle("collapsed");
      });


      // Prevent map drag/zoom when interacting with legend
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      return div;
    };

    legend.addTo(map);

    // 5) Fit to bounds
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  });
})();
