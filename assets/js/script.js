document.addEventListener("DOMContentLoaded", () => {
  const apvItems = Array.from(document.querySelectorAll(".apv-item"));
  const searchInput = document.getElementById("apvSearch");

  // ============ DROPDOWN / ACCORDION ============
  // (werkt ook na highlights, omdat we alleen innerHTML van content aanpassen)
  apvItems.forEach((item) => {
    const header = item.querySelector(".apv-header");
    if (!header) return;

    header.addEventListener("click", () => {
      item.classList.toggle("open");
    });
  });

  // ============ SEARCH HELPERS ============
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // We slaan originele HTML op zodat we highlights netjes kunnen resetten.
  const searchableSelectors = [".apv-header span", ".apv-header small", ".apv-body"];

  apvItems.forEach((item) => {
    searchableSelectors.forEach((sel) => {
      item.querySelectorAll(sel).forEach((el) => {
        if (!el.dataset.originalHtml) el.dataset.originalHtml = el.innerHTML;
      });
    });
  });

  const resetHighlights = () => {
    apvItems.forEach((item) => {
      searchableSelectors.forEach((sel) => {
        item.querySelectorAll(sel).forEach((el) => {
          if (el.dataset.originalHtml) el.innerHTML = el.dataset.originalHtml;
        });
      });
    });
  };

  const applyHighlight = (query) => {
    const safe = escapeRegExp(query);
    const re = new RegExp(safe, "gi");

    apvItems.forEach((item) => {
      searchableSelectors.forEach((sel) => {
        item.querySelectorAll(sel).forEach((el) => {
          if (!el.dataset.originalHtml) return;
          const original = el.dataset.originalHtml;

          // Highlight alleen in HTML tekst (simpel & werkt goed voor jouw structuur)
          // We vervangen matches met <mark>.
          el.innerHTML = original.replace(re, (match) => `<mark class="apv-mark">${match}</mark>`);
        });
      });
    });
  };

  const itemMatches = (item, query) => {
    const q = query.toLowerCase();
    // Gebruik textContent zodat het ook werkt zonder HTML-gepruts
    return item.textContent.toLowerCase().includes(q);
  };

  // Scroll naar eerste match + open hem
  const scrollToFirstMatch = (query) => {
    const first = apvItems.find((item) => itemMatches(item, query));
    if (!first) return;

    // open eerste match zodat je meteen de inhoud ziet
    first.classList.add("open");

    // smooth scroll naar het item (met topbar offset)
    first.scrollIntoView({ behavior: "smooth", block: "start" });

    // kleine offset correctie voor fixed header
    setTimeout(() => {
      const y = window.scrollY;
      window.scrollTo({ top: y - 95, behavior: "smooth" });
    }, 250);
  };

  // ============ LIVE SEARCH ============
  if (searchInput) {
    let lastQuery = "";

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim();

      // Reset altijd eerst (voorkomt kapotte markup)
      resetHighlights();

      // Alles terug zichtbaar als leeg
      if (!query) {
        apvItems.forEach((item) => {
          item.style.display = "";
        });
        lastQuery = "";
        return;
      }

      // Filter items (per letter)
      apvItems.forEach((item) => {
        item.style.display = itemMatches(item, query) ? "" : "none";
      });

      // Highlight matches (geel)
      applyHighlight(query);

      // Scroll alleen als query veranderd is (anders irritant)
      if (query !== lastQuery) {
        scrollToFirstMatch(query);
        lastQuery = query;
      }
    });

    // Bonus: ENTER focust ook naar eerste match (extra zekerheid)
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
        scrollToFirstMatch(query);
      }
    });
  }
});
