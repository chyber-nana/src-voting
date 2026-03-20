if (!sessionStorage.getItem('adminLoggedIn')) {
  alert("Hi")
  window.location.href = '/admin-login.html';
}

const searchTrans = document.getElementById("searchTrans");

let adminCategoriesData = [];
let adminSelectedCategoryId = null;

const PRICE_PER_VOTE = 1;

// Admin manager elements
const openManagerBtn = document.getElementById("openManagerBtn");
const managerShell = document.getElementById("managerShell");
const categoriesList = document.getElementById("categoriesList");
const nomineesList = document.getElementById("nomineesList");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const selectedCategoryTitle = document.getElementById("selectedCategoryTitle");
const emptyNomineesState = document.getElementById("emptyNomineesState");
const nomineesEditor = document.getElementById("nomineesEditor");
const newNomineeInput = document.getElementById("newNomineeInput");
const addNomineeBtn = document.getElementById("addNomineeBtn");
const renameCategoryBtn = document.getElementById("renameCategoryBtn");
const deleteCategoryBtn = document.getElementById("deleteCategoryBtn");

// Manual vote elements
const manualCategory = document.getElementById("manualCategory");
const manualNominee = document.getElementById("manualNominee");
const manualVotes = document.getElementById("manualVotes");
const manualVoteBtn = document.getElementById("manualVoteBtn");
const amountPreview = document.getElementById("amountPreview");

function safeText(value, fallback = "") {
  return value ?? fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchWithAuthRedirect(url, options = {}) {
  const res = await fetch(url, { cache: "no-store", ...options });

  if (res.status === 403) {
    window.location.href = "/admin-login.html";
    throw new Error("Unauthorized");
  }

  return res;
}

async function loadQueue() {
  try {
    const res = await fetchWithAuthRedirect("/api/admin/queue");
    if (!res.ok) return;

    const data = await res.json();
    const tbody = document.getElementById("verificationList");

    const searchValue = (searchTrans?.value || "").trim().toLowerCase();

    const filtered = data.filter((item) => {
      if (!searchValue) return true;

      return [
        item.momo_trans_id,
        item.voter_phone,
        item.voter_name,
        item.nominee_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue));
    });

    tbody.innerHTML = filtered
      .map(
        (item) => `
        <tr>
          <td data-label="Voter Details">
            <div class="voterData">
              <span class="name">Voter: ${escapeHtml(safeText(item.voter_phone || item.voter_name, "Anonymous"))}</span>
              <span class="phone">${escapeHtml(safeText(item.voter_class, "N/A"))}</span>
            </div>
          </td>
          <td data-label="Nominee">${escapeHtml(safeText(item.nominee_name, "Unknown"))}</td>
          <td data-label="Votes/Amount">
            <div class="voteData">
              <span class="voteCountBadge">${Number(item.votes_count || 0)} Votes</span>
              <span class="ghsAmount">GHS ${Number(item.amount_paid || 0).toFixed(2)}</span>
            </div>
          </td>
          <td data-label="MoMo Trans ID">
            <span class="transBadge">${escapeHtml(safeText(item.momo_trans_id, "N/A"))}</span>
          </td>
          <td data-label="Action">
            <div class="actionButtons">
              <button class="approveBtn" onclick="updateVote(${Number(item.id)}, 'approved')">✓</button>
              <button class="rejectBtn" onclick="updateVote(${Number(item.id)}, 'rejected')">✕</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#94a3b8;">
            No pending records found.
          </td>
        </tr>
      `;
    }
  } catch (err) {
    console.error("Error loading queue:", err);
  }
}

async function updateStats() {
  try {
    const res = await fetchWithAuthRedirect("/api/admin/stats");
    if (!res.ok) return;

    const stats = await res.json();

    document.getElementById("totalRev").innerText = Number(stats.revenue || 0).toFixed(2);
    document.getElementById("pendingCount").innerText = stats.pendingCount ?? 0;

    const topPending = document.getElementById("topPendingCount");
    if (topPending) {
      topPending.innerText = stats.pendingCount ?? 0;
    }
  } catch (err) {
    console.error("Error updating stats:", err);
  }
}

async function updateVote(id, status) {
  try {
    const res = await fetchWithAuthRedirect("/api/admin/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id, status })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to update vote");
      return;
    }

    await loadQueue();
    await updateStats();
    await refreshAdminManager();
  } catch (err) {
    console.error("Error updating vote:", err);
  }
}

window.updateVote = updateVote;

function updateAmountPreview() {
  const votes = Number(manualVotes?.value || 0);
  const amount = votes * PRICE_PER_VOTE;

  if (amountPreview) {
    amountPreview.textContent = `GH₵ ${amount.toFixed(2)}`;
  }
}

async function loadAdminCategories() {
  try {
    const res = await fetchWithAuthRedirect("/api/dashboard");
    if (!res.ok) return;

    const data = await res.json();
    adminCategoriesData = data.categories || [];
  } catch (err) {
    console.error("Error loading admin categories:", err);
  }
}

function renderAdminCategories() {
  if (!categoriesList) return;

  categoriesList.innerHTML = "";

  adminCategoriesData.forEach((category) => {
    const wrap = document.createElement("div");
    wrap.className = "categoryItem";

    wrap.innerHTML = `
      <div class="categoryMain">
        <button
          class="categoryClickable ${adminSelectedCategoryId === category.id ? "active" : ""}"
          data-id="${category.id}"
        >
          ${escapeHtml(category.name)}
        </button>
      </div>
      <div class="categoryMeta">${category.nominees.length} nominee(s)</div>
    `;

    categoriesList.appendChild(wrap);
  });

  document.querySelectorAll(".categoryClickable").forEach((button) => {
    button.addEventListener("click", () => {
      adminSelectedCategoryId = Number(button.dataset.id);
      renderAdminCategories();
      renderAdminNominees();
    });
  });
}

function renderAdminNominees() {
  if (!selectedCategoryTitle || !emptyNomineesState || !nomineesEditor || !nomineesList) return;

  const category = adminCategoriesData.find((c) => c.id === adminSelectedCategoryId);

  if (!category) {
    selectedCategoryTitle.textContent = "Select a Category";
    emptyNomineesState.classList.remove("hidden");
    nomineesEditor.classList.add("hidden");
    nomineesList.innerHTML = "";
    return;
  }

  selectedCategoryTitle.textContent = category.name;
  emptyNomineesState.classList.add("hidden");
  nomineesEditor.classList.remove("hidden");
  nomineesList.innerHTML = "";

  category.nominees.forEach((nominee) => {
    const item = document.createElement("div");
    item.className = "nomineeItem";

    item.innerHTML = `
      <div class="nomineeEditorRow">
        <input
          type="text"
          class="nomineeNameInput"
          value="${escapeHtml(nominee.name)}"
          data-id="${nominee.id}"
        >
        <button class="actionBtn subtleBtn saveNomineeBtn" data-id="${nominee.id}">Save</button>
        <button class="actionBtn dangerBtn deleteNomineeBtn" data-id="${nominee.id}">Remove</button>
      </div>
    `;

    nomineesList.appendChild(item);
  });

  document.querySelectorAll(".saveNomineeBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nomineeId = Number(btn.dataset.id);
      const input = document.querySelector(`.nomineeNameInput[data-id="${nomineeId}"]`);
      const newName = input?.value.trim();

      if (!newName) return;

      try {
        const res = await fetchWithAuthRedirect(`/api/nominees/${nomineeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: newName })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Failed to update nominee");
          return;
        }

        await refreshAdminManager();
      } catch (err) {
        console.error("Error updating nominee:", err);
        alert("Could not update nominee");
      }
    });
  });

  document.querySelectorAll(".deleteNomineeBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nomineeId = Number(btn.dataset.id);
      const confirmed = confirm("Delete this nominee?");
      if (!confirmed) return;

      try {
        const res = await fetchWithAuthRedirect(`/api/nominees/${nomineeId}`, {
          method: "DELETE"
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Failed to delete nominee");
          return;
        }

        await refreshAdminManager();
      } catch (err) {
        console.error("Error deleting nominee:", err);
        alert("Could not delete nominee");
      }
    });
  });
}

async function loadManualVoteCategories() {
  if (!manualCategory || !manualNominee) return;

  try {
    const res = await fetchWithAuthRedirect("/api/categories");
    if (!res.ok) return;

    const categories = await res.json();
    manualCategory.innerHTML = "";

    categories.forEach((category) => {
      manualCategory.innerHTML += `<option value="${category.id}">${escapeHtml(category.name)}</option>`;
    });

    if (categories.length > 0) {
      await loadManualVoteNominees(categories[0].id);
    } else {
      manualNominee.innerHTML = "";
    }
  } catch (err) {
    console.error("Error loading manual vote categories:", err);
  }
}

async function loadManualVoteNominees(categoryId) {
  if (!manualNominee) return;

  try {
    const res = await fetchWithAuthRedirect(`/api/nominees/${categoryId}`);
    if (!res.ok) return;

    const nominees = await res.json();
    manualNominee.innerHTML = "";

    nominees.forEach((nominee) => {
      manualNominee.innerHTML += `<option value="${nominee.id}">${escapeHtml(nominee.name)}</option>`;
    });
  } catch (err) {
    console.error("Error loading manual vote nominees:", err);
  }
}

async function refreshAdminManager() {
  try {
    await loadAdminCategories();

    if (adminSelectedCategoryId) {
      const exists = adminCategoriesData.some((category) => category.id === adminSelectedCategoryId);
      if (!exists) {
        adminSelectedCategoryId = null;
      }
    }

    renderAdminCategories();
    renderAdminNominees();
    await loadManualVoteCategories();
  } catch (err) {
    console.error("Error refreshing admin manager:", err);
  }
}

searchTrans?.addEventListener("input", () => {
  loadQueue();
});

openManagerBtn?.addEventListener("click", () => {
  managerShell?.classList.toggle("hidden");
  openManagerBtn.textContent = managerShell?.classList.contains("hidden") ? "Edit" : "Close";
});

addCategoryBtn?.addEventListener("click", async () => {
  const name = newCategoryInput?.value.trim();
  if (!name) return;

  try {
    const res = await fetchWithAuthRedirect("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Failed to add category");
      return;
    }

    newCategoryInput.value = "";
    await refreshAdminManager();
  } catch (err) {
    console.error("Error adding category:", err);
    alert("Something went wrong");
  }
});

addNomineeBtn?.addEventListener("click", async () => {
  const name = newNomineeInput?.value.trim();

  if (!adminSelectedCategoryId || !name) return;

  try {
    const res = await fetchWithAuthRedirect("/api/nominees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        category_id: adminSelectedCategoryId
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Failed to add nominee");
      return;
    }

    newNomineeInput.value = "";
    await refreshAdminManager();
  } catch (err) {
    console.error("Error adding nominee:", err);
    alert("Something went wrong while adding nominee");
  }
});

renameCategoryBtn?.addEventListener("click", async () => {
  const category = adminCategoriesData.find((c) => c.id === adminSelectedCategoryId);
  if (!category) return;

  const newName = prompt("Enter new category name:", category.name);
  if (!newName || !newName.trim()) return;

  try {
    const res = await fetchWithAuthRedirect(`/api/categories/${adminSelectedCategoryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: newName.trim() })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Failed to rename category");
      return;
    }

    await refreshAdminManager();
  } catch (err) {
    console.error("Error renaming category:", err);
    alert("Could not rename category");
  }
});

deleteCategoryBtn?.addEventListener("click", async () => {
  if (!adminSelectedCategoryId) return;

  const category = adminCategoriesData.find((c) => c.id === adminSelectedCategoryId);
  if (!category) return;

  const confirmed = confirm(`Delete "${category.name}" and all its nominees?`);
  if (!confirmed) return;

  try {
    const res = await fetchWithAuthRedirect(`/api/categories/${adminSelectedCategoryId}`, {
      method: "DELETE"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Failed to delete category");
      return;
    }

    adminSelectedCategoryId = null;
    await refreshAdminManager();
  } catch (err) {
    console.error("Error deleting category:", err);
    alert("Could not delete category");
  }
});

manualCategory?.addEventListener("change", async () => {
  await loadManualVoteNominees(manualCategory.value);
});

manualVotes?.addEventListener("input", updateAmountPreview);

manualVoteBtn?.addEventListener("click", async () => {
  const nomineeId = Number(manualNominee?.value);
  const votesCount = Number(manualVotes?.value);

  if (!nomineeId || votesCount < 1) {
    alert("Enter a valid vote count");
    return;
  }

  const selectedOption = manualNominee.options[manualNominee.selectedIndex];
  const nomineeName = selectedOption ? selectedOption.textContent : "Unknown";
  const amountPaid = votesCount * PRICE_PER_VOTE;

  try {
    const res = await fetchWithAuthRedirect("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        votes: [
          {
            nominee_id: nomineeId,
            nomineeName,
            nomineeVotes: votesCount,
            amount_paid: amountPaid
          }
        ],
        transId: `ADMIN-MANUAL-${Date.now()}`,
        voter_phone: "Admin Manual Entry"
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Failed to add votes");
      return;
    }

    manualVotes.value = 1;
    updateAmountPreview();

    alert("Votes added successfully.");

    await loadQueue();
    await updateStats();
    await refreshAdminManager();
  } catch (err) {
    console.error("Error adding manual votes:", err);
    alert("Something went wrong while adding votes");
  }
});

updateAmountPreview();
loadQueue();
updateStats();
refreshAdminManager();
