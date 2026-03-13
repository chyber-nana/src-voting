let categoriesData = [];

const categoryFilter = document.getElementById("categoryFilter");
const nomineeTableBody = document.getElementById("nomineeTableBody");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDashboard() {
  try {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    const data = await res.json();

    categoriesData = data.categories || [];

    renderCategoryFilter();
    loadAllCategories();
    renderDashboardSummary(data);
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

function getNomineeStatus(category, nominee) {
  if (!category.nominees || category.nominees.length === 0) {
    return { label: "No votes", className: "inactive" };
  }

  const maxVotes = Math.max(...category.nominees.map((n) => Number(n.votes) || 0));
  const nomineeVotes = Number(nominee.votes) || 0;
  const leaders = category.nominees.filter((n) => (Number(n.votes) || 0) === maxVotes);

  if (maxVotes === 0) {
    return { label: "No votes", className: "inactive" };
  }

  if (nomineeVotes === maxVotes && leaders.length > 1) {
    return { label: "Tied", className: "tied" };
  }

  if (nomineeVotes === maxVotes) {
    return { label: "Leading", className: "leading" };
  }

  return { label: "Trailing", className: "trailing" };
}

function renderDashboardSummary(data) {
  const summaryGrid = document.getElementById("summaryGrid");
  const totalAmount = document.getElementById("totalAmount");

  if (!summaryGrid || !totalAmount) return;

  totalAmount.textContent = `GH₵ ${Number(data.totalMoney || 0).toFixed(2)}`;

  document.querySelectorAll(".summaryCard.dynamicCard").forEach((card) => card.remove());

  (data.categories || []).forEach((category) => {
    let topNominee = null;

    if (category.nominees && category.nominees.length > 0) {
      topNominee = [...category.nominees].sort((a, b) => Number(b.votes) - Number(a.votes))[0];
    }

    const card = document.createElement("div");
    card.className = "summaryCard dynamicCard";

    card.innerHTML = `
      <span class="cardLabel">${escapeHtml(category.name)}</span>
      <h3>${topNominee ? escapeHtml(topNominee.name) : "No nominee yet"}</h3>
      <p>${topNominee ? `${Number(topNominee.votes).toLocaleString()} votes` : "0 votes"}</p>
    `;

    summaryGrid.appendChild(card);
  });
}

function loadAllCategories() {
  nomineeTableBody.innerHTML = "";

  let rowNumber = 1;

  categoriesData.forEach((category) => {
    if (category.nominees.length > 0) {
      category.nominees.forEach((nominee) => {
        const status = getNomineeStatus(category, nominee);

        nomineeTableBody.innerHTML += `
          <tr>
            <td>${rowNumber++}</td>
            <td>${escapeHtml(nominee.name)}</td>
            <td>${escapeHtml(category.name)}</td>
            <td>${Number(nominee.votes || 0)}</td>
            <td>${escapeHtml(nominee.amount)}</td>
            <td><span class="status ${status.className}">${status.label}</span></td>
          </tr>
        `;
      });
    }
  });

  if (!nomineeTableBody.innerHTML.trim()) {
    nomineeTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:#94a3b8;">
          No nominees available yet.
        </td>
      </tr>
    `;
  }
}

function renderTableInfo(categoryName) {
  nomineeTableBody.innerHTML = "";

  const category = categoriesData.find((c) => c.name === categoryName);

  if (!category || !category.nominees.length) {
    nomineeTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:#94a3b8;">
          No nominees available in this category.
        </td>
      </tr>
    `;
    return;
  }

  let rowNumber = 1;

  category.nominees.forEach((nominee) => {
    const status = getNomineeStatus(category, nominee);

    nomineeTableBody.innerHTML += `
      <tr>
        <td>${rowNumber++}</td>
        <td>${escapeHtml(nominee.name)}</td>
        <td>${escapeHtml(category.name)}</td>
        <td>${Number(nominee.votes || 0)}</td>
        <td>${escapeHtml(nominee.amount)}</td>
        <td><span class="status ${status.className}">${status.label}</span></td>
      </tr>
    `;
  });
}

function renderCategoryFilter() {
  if (!categoryFilter) return;

  categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  categoryFilter.appendChild(allOption);

  categoriesData.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    categoryFilter.appendChild(option);
  });
}

categoryFilter?.addEventListener("change", () => {
  if (categoryFilter.value === "all") {
    loadAllCategories();
  } else {
    renderTableInfo(categoryFilter.value);
  }
});

loadDashboard();
