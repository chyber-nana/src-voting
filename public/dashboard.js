let categoriesData = [];
let selectedCategoryId = null;

const PRICE_PER_VOTE = 1;

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
const categoryFilter = document.getElementById("categoryFilter");
const nomineeTableBody = document.getElementById("nomineeTableBody");

const manualCategory = document.getElementById("manualCategory");
const manualNominee = document.getElementById("manualNominee");
const manualVotes = document.getElementById("manualVotes");
const manualVoteBtn = document.getElementById("manualVoteBtn");
const amountPreview = document.getElementById("amountPreview");

async function refreshDashboard() {
  try {
    await loadDashboard();
    await loadDashboardSummary();
    await loadManualVoteCategories();

    if (selectedCategoryId) {
      const exists = categoriesData.some(category => category.id === selectedCategoryId);
      if (!exists) {
        selectedCategoryId = null;
      }
    }

    renderCategories();
    renderCategoryFilter();

    if (selectedCategoryId) {
      renderNominees();
    } else {
      selectedCategoryTitle.textContent = "Select a Category";
      emptyNomineesState.classList.remove("hidden");
      nomineesEditor.classList.add("hidden");
    }
  } catch (error) {
    console.error("Error refreshing dashboard:", error);
  }
}

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  categoriesData = data.categories;
  renderCategories();
  renderCategoryFilter();
  loadAllCategories();
}

function getNomineeStatus(category, nominee) {
  if (!category.nominees || category.nominees.length === 0) {
    return { label: "No votes", className: "inactive" };
  }

  const maxVotes = Math.max(...category.nominees.map(n => Number(n.votes) || 0));
  const nomineeVotes = Number(nominee.votes) || 0;
  const leaders = category.nominees.filter(n => (Number(n.votes) || 0) === maxVotes);

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

async function loadDashboardSummary() {
  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();

    const summaryGrid = document.getElementById("summaryGrid");
    const totalAmount = document.getElementById("totalAmount");

    totalAmount.textContent = `GH₵ ${Number(data.totalMoney || 0).toFixed(2)}`;
    document.querySelectorAll(".summaryCard.dynamicCard").forEach(card => card.remove());

    data.categories.forEach(category => {
      let topNominee = null;

      if (category.nominees && category.nominees.length > 0) {
        topNominee = [...category.nominees].sort((a, b) => b.votes - a.votes)[0];
      }

      const card = document.createElement("div");
      card.className = "summaryCard dynamicCard";

      card.innerHTML = `
        <span class="cardLabel">${category.name}</span>
        <h3>${topNominee ? topNominee.name : "No nominee yet"}</h3>
        <p>${topNominee ? `${topNominee.votes.toLocaleString()} votes` : "0 votes"}</p>
      `;

      summaryGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading dashboard summary:", error);
  }
}

function updateAmountPreview() {
  const votes = Number(manualVotes.value) || 0;
  const amount = votes * PRICE_PER_VOTE;
  amountPreview.textContent = `GH₵ ${amount.toFixed(2)}`;
}

manualVotes.addEventListener("input", updateAmountPreview);
updateAmountPreview();

const loadAllCategories = () => {
  nomineeTableBody.innerHTML = "";

  categoriesData.forEach(category => {
    if (category.nominees.length > 0) {
      let x = 1;

      category.nominees.forEach(nominee => {
        const status = getNomineeStatus(category, nominee);

        nomineeTableBody.innerHTML += `
          <tr>
            <td>${x++}</td>
            <td>${nominee.name}</td>
            <td>${category.name}</td>
            <td>${nominee.votes}</td>
            <td>${nominee.amount}</td>
            <td><span class="status ${status.className}">${status.label}</span></td>
          </tr>
        `;
      });
    }
  });
};

openManagerBtn.addEventListener("click", () => {
  managerShell.classList.toggle("hidden");
  openManagerBtn.textContent = managerShell.classList.contains("hidden") ? "Edit" : "Close";
});

const countTotalAmount = () => {
  let amount = 0;
  categoriesData.forEach(category => {
    category.nominees.forEach(nominee => {
      amount += nominee.votes;
    });
  });
  document.getElementById("totalAmount").innerHTML = `GH₵ ${amount}`;
};

const renderTableInfo = (catName) => {
  nomineeTableBody.innerHTML = "";

  categoriesData.forEach(category => {
    if (category.name === catName) {
      let x = 1;

      category.nominees.forEach(nominee => {
        const status = getNomineeStatus(category, nominee);

        nomineeTableBody.innerHTML += `
          <tr>
            <td>${x++}</td>
            <td>${nominee.name}</td>
            <td>${category.name}</td>
            <td>${nominee.votes}</td>
            <td>${nominee.amount}</td>
            <td><span class="status ${status.className}">${status.label}</span></td>
          </tr>
        `;
      });
    }
  });
};

categoryFilter.addEventListener("change", () => {
  if (categoryFilter.value === "all") {
    loadAllCategories();
  } else {
    renderTableInfo(categoryFilter.value);
  }
});

function renderCategoryFilter() {
  categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  categoryFilter.appendChild(allOption);

  categoriesData.forEach(category => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    categoryFilter.appendChild(option);
  });
}

function renderCategories() {
  categoriesList.innerHTML = "";

  categoriesData.forEach(category => {
    const wrap = document.createElement("div");
    wrap.className = "categoryItem";

    wrap.innerHTML = `
      <div class="categoryMain">
        <button class="categoryClickable ${selectedCategoryId === category.id ? "active" : ""}" data-id="${category.id}">
          ${category.name}
        </button>
      </div>
      <div class="categoryMeta">${category.nominees.length} nominee(s)</div>
    `;

    categoriesList.appendChild(wrap);
  });

  document.querySelectorAll(".categoryClickable").forEach(button => {
    button.addEventListener("click", () => {
      selectedCategoryId = Number(button.dataset.id);
      renderCategories();
      renderNominees();
    });
  });
}

function renderNominees() {
  const category = categoriesData.find(c => c.id === selectedCategoryId);

  if (!category) {
    selectedCategoryTitle.textContent = "Select a Category";
    emptyNomineesState.classList.remove("hidden");
    nomineesEditor.classList.add("hidden");
    return;
  }

  selectedCategoryTitle.textContent = category.name;
  emptyNomineesState.classList.add("hidden");
  nomineesEditor.classList.remove("hidden");

  nomineesList.innerHTML = "";

  category.nominees.forEach(nominee => {
    const item = document.createElement("div");
    item.className = "nomineeItem";

    item.innerHTML = `
      <div class="nomineeEditorRow">
        <input 
          type="text" 
          class="nomineeNameInput" 
          value="${nominee.name}" 
          data-id="${nominee.id}"
        >
        <button class="actionBtn subtleBtn saveNomineeBtn" data-id="${nominee.id}">Save</button>
        <button class="actionBtn dangerBtn deleteNomineeBtn" data-id="${nominee.id}">Remove</button>
      </div>
    `;

    nomineesList.appendChild(item);
  });

  document.querySelectorAll(".saveNomineeBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nomineeId = Number(btn.dataset.id);
      const input = document.querySelector(`.nomineeNameInput[data-id="${nomineeId}"]`);
      const newName = input.value.trim();

      if (!newName) return;

      try {
        const res = await fetch(`/api/nominees/${nomineeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: newName })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to update nominee");
          return;
        }

        await refreshDashboard();
      } catch (error) {
        console.error("Error updating nominee:", error);
        alert("Could not update nominee");
      }
    });
  });

  document.querySelectorAll(".deleteNomineeBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nomineeId = Number(btn.dataset.id);

      const confirmDelete = confirm("Delete this nominee?");
      if (!confirmDelete) return;

      try {
        const res = await fetch(`/api/nominees/${nomineeId}`, {
          method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to delete nominee");
          return;
        }

        await refreshDashboard();
      } catch (error) {
        console.error("Error deleting nominee:", error);
        alert("Could not delete nominee");
      }
    });
  });
}

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;

  try {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to add category");
      return;
    }

    newCategoryInput.value = "";
    await refreshDashboard();
  } catch (error) {
    console.error("Error adding category:", error);
    alert("Something went wrong");
  }
});

addNomineeBtn.addEventListener("click", async () => {
  const name = newNomineeInput.value.trim();

  if (!selectedCategoryId || !name) return;

  try {
    const res = await fetch("/api/nominees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        category_id: selectedCategoryId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to add nominee");
      return;
    }

    newNomineeInput.value = "";
    await refreshDashboard();
  } catch (error) {
    console.error("Error adding nominee:", error);
    alert("Something went wrong while adding nominee");
  }
});

async function loadCategories() {
  try {
    const res = await fetch("/api/categories");
    const categories = await res.json();

    const categoriesWithNominees = await Promise.all(
      categories.map(async (category) => {
        const nomineeRes = await fetch(`/api/nominees/${category.id}`);
        const nominees = await nomineeRes.json();

        return {
          id: category.id,
          name: category.name,
          nominees: nominees.map((nominee) => ({
            id: nominee.id,
            name: nominee.name,
            votes: nominee.votes || 0,
            amount: `GH₵ ${Number(nominee.amount_made || 0).toFixed(2)}`
          })),
          nomineeCount: nominees.length
        };
      })
    );

    categoriesData = categoriesWithNominees;
    renderCategories();
    renderCategoryFilter();
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

renameCategoryBtn.addEventListener("click", async () => {
  const category = categoriesData.find(c => c.id === selectedCategoryId);
  if (!category) return;

  const newName = prompt("Enter new category name:", category.name);
  if (!newName || !newName.trim()) return;

  try {
    const res = await fetch(`/api/categories/${selectedCategoryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: newName.trim() })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to rename category");
      return;
    }

    await refreshDashboard();
  } catch (error) {
    console.error("Error renaming category:", error);
    alert("Could not rename category");
  }
});

deleteCategoryBtn.addEventListener("click", async () => {
  if (!selectedCategoryId) return;

  const category = categoriesData.find(c => c.id === selectedCategoryId);
  if (!category) return;

  const confirmDelete = confirm(`Delete "${category.name}" and all its nominees?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/categories/${selectedCategoryId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to delete category");
      return;
    }

    selectedCategoryId = null;
    await refreshDashboard();
  } catch (error) {
    console.error("Error deleting category:", error);
    alert("Could not delete category");
  }
});

async function loadManualVoteCategories() {
  try {
    const res = await fetch("/api/categories");
    const categories = await res.json();

    manualCategory.innerHTML = "";

    categories.forEach(category => {
      manualCategory.innerHTML += `
        <option value="${category.id}">${category.name}</option>
      `;
    });

    if (categories.length > 0) {
      await loadManualVoteNominees(categories[0].id);
    } else {
      manualNominee.innerHTML = "";
    }
  } catch (error) {
    console.error("Error loading manual vote categories:", error);
  }
}

async function loadManualVoteNominees(categoryId) {
  try {
    const res = await fetch(`/api/nominees/${categoryId}`);
    const nominees = await res.json();

    manualNominee.innerHTML = "";

    nominees.forEach(nominee => {
      manualNominee.innerHTML += `
        <option value="${nominee.id}">${nominee.name}</option>
      `;
    });
  } catch (error) {
    console.error("Error loading manual vote nominees:", error);
  }
}



manualCategory.addEventListener("change", async () => {
  await loadManualVoteNominees(manualCategory.value);
});

manualVoteBtn.addEventListener("click", async () => {
  const nominee_id = Number(manualNominee.value);
  const votes_count = Number(manualVotes.value);

  if (!nominee_id || votes_count < 1) {
    alert("Enter a valid vote count");
    return;
  }

  const amount_paid = votes_count * PRICE_PER_VOTE;

  try {
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nominee_id,
        voter_name: "Manual Dashboard Entry",
        voter_class: "Admin",
        votes_count,
        amount_paid
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to add votes");
      return;
    }

    manualVotes.value = 1;
    updateAmountPreview();

    alert("Votes added successfully");

    await refreshDashboard();
  } catch (error) {
    console.error(error);
    alert("Something went wrong while adding votes");
  }
});

refreshDashboard();