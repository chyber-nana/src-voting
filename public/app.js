const incButton = document.querySelector(".increase");
const decButton = document.querySelector(".decrease");
const voteincButton = document.querySelector(".voteFilter .increase");
const votedecButton = document.querySelector(".voteFilter .decrease");
const displayNumber = document.querySelector(".displayNumber .number");
const votesList = document.querySelector(".votesList");
const categorySelect = document.getElementById("category");
const nomineeSelect = document.getElementById("nominee");

let votesNumber = 0;
let voteVotesNumber = 0;
displayNumber.textContent = votesNumber;
const votesElements = [];
const PRICE_PER_VOTE = 1;
let categories = [];

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  categories = data.categories;
  renderCategories();
}

loadDashboard();

const renderCategories = () => {
  categorySelect.innerHTML = "";

  for (let cat = 0; cat < categories.length; cat++) {
    categorySelect.innerHTML += `<option value="${categories[cat].name}">${categories[cat].name}</option>`;
    
  }

  if (categories.length > 0) {
    nomineeSelect.innerHTML = "";
    for (let nom = 0; nom < categories[0].nominees.length; nom++) {
      const element = categories[0].nominees[nom];
      nomineeSelect.innerHTML += `<option value="${element.id}">${element.name}</option>`;
    }
  }
};

categorySelect.addEventListener("change", () => {
  for (let cat = 0; cat < categories.length; cat++) {
    const category = categories[cat]; // Renamed for clarity
    if (categorySelect.value.toUpperCase() === category.name.toUpperCase()) {
      nomineeSelect.innerHTML = "";
      for (let nom = 0; nom < category.nominees.length; nom++) {
        const nominee = category.nominees[nom]; // Use a clear name like 'nominee'
        // FIX: Use nominee.id and nominee.name
        nomineeSelect.innerHTML += `<option value="${nominee.id}">${nominee.name}</option>`;
      }
    }
  }
});

function renderVotes() {
  if (votesElements.length === 0) {
    votesList.classList.add("empty");
    votesList.innerHTML = `<li class="emptyMessage">Click + To add nomination</li>`;
    return;
  }

  votesList.classList.remove("empty");

  votesList.innerHTML = votesElements
    .map((vote) => {
      if (!vote.filled) {
        return `
  <li class="vote voteSkeleton" data-id="${vote.id}">
    <div class="voteTop">
      <span class="voteIndex">${vote.id}</span>
      <span class="voteHint">Select Category & Nominee</span>
    </div>

    <div class="votePreview">
      <div class="voteImage skeletonBox"></div>

      <div class="voteMeta">
        <div class="skeletonLine skeletonTitle"></div>
        <div class="skeletonLine skeletonText"></div>
        <div class="skeletonLine skeletonText small"></div>
      </div>
    </div>
  </li>
`;
      }

      return `
  <li class="vote voted" data-id="${vote.id}">
    <div class="voteTop">
      <span class="voteIndex">${vote.id}</span>
      <span class="voteHint filled">Selected</span>
    </div>

    <div class="votePreview">
      <div class="voteImage">
        <img src="./images/images (1).jfif" alt="${vote.nomineeName}">
      </div>

      <div class="voteMeta">
        <span class="nomineeName">${vote.nomineeName}</span>
        <span class="nomineeCategory">${vote.nomineeCategory}</span>
        <span class="nomineeVote">${vote.nomineeVotes} vote(s)</span>
      </div>
    </div>
  </li>
`;
    })
    .join("");

  bindVoteClicks();
}

const updateVotes = (key) => {
  if (key === -2) {
    renderVotes();
  } else {
    votesElements.splice(key, 1);

    // re-number ids
    votesElements.forEach((vote, index) => {
      vote.id = index + 1;
    });

    votesNumber = votesElements.length;
    displayNumber.textContent = votesNumber;

    renderVotes();
  }
};

const voteDisplayBox = document.querySelector(".voteFilter .displayNumber");
const voteCountModal = document.getElementById("voteCountModal");
const voteCountValue = document.getElementById("voteCountValue");
const voteCountInput = document.getElementById("voteCountInput");
const voteCountPlus = document.getElementById("voteCountPlus");
const voteCountMinus = document.getElementById("voteCountMinus");

function openVoteCountModal() {
    voteCountModal.style.display = "flex";
    voteCountValue.textContent = voteVotesNumber;
    voteCountInput.value = voteVotesNumber;
}

function closeVoteCountModal() {
    voteCountModal.style.display = "none";
}

function syncVoteCountDisplay(value) {
    const safeValue = Math.max(0, Number(value) || 0);
    voteCountValue.textContent = safeValue;
    voteCountInput.value = safeValue;
}

function applyVoteCount() {
    const selectedVotes = Math.max(0, Number(voteCountInput.value) || 0);
    voteVotesNumber = selectedVotes;
    document.querySelector(".voteFilter .number").textContent = selectedVotes;
    closeVoteCountModal();
}

voteDisplayBox.addEventListener("click", openVoteCountModal);

voteCountPlus.addEventListener("click", () => {
    syncVoteCountDisplay(Number(voteCountInput.value || 0) + 1);
});

voteCountMinus.addEventListener("click", () => {
    syncVoteCountDisplay(Math.max(0, Number(voteCountInput.value || 0) - 1));
});

voteCountInput.addEventListener("input", () => {
    syncVoteCountDisplay(voteCountInput.value);
});

voteCountModal.addEventListener("click", (e) => {
    if (e.target === voteCountModal) {
        closeVoteCountModal();
    }
});

voteCountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        applyVoteCount();
    }
});

const createForm = (voteId) => {
  const form = document.querySelector(".votingForm");
  const okayButton = document.getElementById("okayButton");

  const vote = votesElements.find((item) => item.id === Number(voteId));
  if (!vote) return;

  okayButton.dataset.id = voteId;

  // restore stored vote number for this specific card
  voteVotesNumber = vote.nomineeVotes || 0;
  document.querySelector(".voteFilter .number").textContent = voteVotesNumber;

  // restore category if already chosen
  if (vote.nomineeCategory) {
    categorySelect.value = vote.nomineeCategory;

    const selectedCategory = categories.find(
      (cat) => cat.name.toUpperCase() === vote.nomineeCategory.toUpperCase()
    );

    nomineeSelect.innerHTML = "";

    if (selectedCategory) {
      selectedCategory.nominees.forEach((nominee) => {
        nomineeSelect.innerHTML += `<option value="${nominee.id}">${nominee.name}</option>`;
      });
    }

    if (vote.nominee_id) {
      nomineeSelect.value = vote.nominee_id;
    }
  }  else if (categories.length > 0) {
    nomineeSelect.innerHTML = "";
    categories[0].nominees.forEach((nominee) => {
      nomineeSelect.innerHTML += `<option value="${nominee.id}">${nominee.name}</option>`;
    });
    // nomineeSelect.value = vote.nomineeName; <--- REMOVE OR FIX THIS
    // Since your options now use IDs as values, setting it to a Name string won't work.
}

  form.classList.add("active");
};

function bindVoteClicks() {
  document.querySelectorAll(".vote").forEach((voteItem) => {
    voteItem.addEventListener("click", () => {
      const voteId = voteItem.dataset.id;
      createForm(voteId);
    });
  });
}

function getNomineeImage(categoryName, nomineeName) {
  const safeName = nomineeName.toLowerCase().replace(/\s+/g, "-");
  return `./images/nominees/${safeName}.jpg`;
}


const nominate = (name, category, votes, image, dataId, nomineeRealId) => {
  const vote = votesElements.find((item) => item.id === Number(dataId));

  if (vote) {
    const parsedId = parseInt(nomineeRealId);

    if (isNaN(parsedId)) {
      console.error("Setup Error: You are passing a name where an ID is expected!");
      return;
    }

    vote.nominee_id = parsedId;
    vote.nomineeName = name;
    vote.nomineeCategory = category;
    vote.nomineeVotes = votes;
    vote.nomineeImage = image;
    vote.amount_paid = votes * PRICE_PER_VOTE;
    vote.filled = true;

    renderVotes();
  }
};


let currentVotePayload = null; // Stores data while user is paying
async function payForVotes(allVotes) {
    const filledVotes = allVotes.filter(v => v.filled === true);

    if (filledVotes.length === 0) {
        alert("Please add and fill at least one nomination.");
        return;
    }

    const totalAmount = calculateTotalAmount();

    currentVotePayload = filledVotes;

    document.getElementById('displayAmount').innerText = totalAmount.toFixed(2);
    document.getElementById('paymentModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('momoTransId').value = '';
}

async function submitManualVote() {
    const transId = document.getElementById('momoTransId').value.trim();
    const btn = document.getElementById('confirmBtn');

    if (!transId) {
        alert("Please enter your Transaction ID to proceed.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        const res = await fetch("/api/votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                votes: currentVotePayload,
                transId: transId,
                voter_phone: currentVotePayload[0].voter_phone || "Unknown" // Ensuring a phone number is sent
            })
        });

        const result = await res.json();

        if (res.ok) {
            alert("Submission successful! Your vote is now in the verification queue.");
            window.location.reload(); // Refresh to clear the cart
        } else {
            alert(result.error || "Submission failed.");
        }
    } catch (err) {
        console.error(err);
        alert("Server error. Please try again.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit for Verification";
    }
}

function calculateTotalAmount() {
  let total = 0;

  votesElements.forEach(vote => {
    if (vote.filled) {
      total += Number(vote.nomineeVotes || 0) * 1; // GH₵1 per vote
    }
  });

  return total;
}

const okayButton = document.getElementById("okayButton");

okayButton.addEventListener("click", () => {
    if (voteVotesNumber > 0) {
        const voteCardId = Number(okayButton.dataset.id); 
        const currentVotes = Number(document.querySelector(".voteFilter .number").textContent);

        // Get the ID from the value, and the Name from the text
        const selectedNomineeId = nomineeSelect.value; 
        const selectedNomineeName = nomineeSelect.options[nomineeSelect.selectedIndex].text;
        const selectedCategoryName = categorySelect.options[categorySelect.selectedIndex].text;
        const selectedNomineeImage = getNomineeImage(selectedCategoryName, selectedNomineeName);

        nominate(
            selectedNomineeName,
            selectedCategoryName,
            currentVotes,
            selectedNomineeImage,
            voteCardId,
            selectedNomineeId // Pass the real database ID here
        );

        document.querySelector(".votingForm").classList.remove("active");
    } else {
        alert("Votes must be above 0");
    }
});

document.querySelector(".voteButton").addEventListener("click", () => {
    payForVotes(votesElements);
});


incButton.addEventListener("click", () => {
  if (!categories.length) return;

  votesNumber += 1;
  votesList.classList.remove("empty");
  displayNumber.textContent = votesNumber;

  const voteId = votesElements.length + 1;

votesElements.push({
  id: voteId,
  nomineeName: "",
  nomineeCategory: "",
  nomineeVotes: 0,
  nomineeImage: "",
  filled: false
});

  renderVotes();
});

decButton.addEventListener("click", () => {
  if (votesElements.length > 0) {
    updateVotes(votesElements.length - 1);
  } else {
    votesList.classList.add("empty");
    votesList.innerHTML = `<li class="emptyMessage">Click + To add nomination</li>`;
  }
});

voteincButton.addEventListener("click", () => {
  voteVotesNumber += 1;
  document.querySelector(".voteFilter .number").innerHTML = voteVotesNumber;
});

votedecButton.addEventListener("click", () => {
  if (voteVotesNumber > 0) {
    voteVotesNumber -= 1;
    document.querySelector(".voteFilter .number").innerHTML = voteVotesNumber;
  } else {
    voteVotesNumber = 0;
    document.querySelector(".voteFilter .number").innerHTML = voteVotesNumber;
  }
});

document.getElementById("cancelButton").addEventListener("click", () => {
  document.querySelector(".votingForm").classList.remove("active");
  voteVotesNumber = 0;
  document.querySelector(".voteFilter .number").innerHTML = voteVotesNumber;
});


window.addEventListener("load", async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get("reference");

    if (!reference) return;

    const res = await fetch(`/api/payments/summary/${encodeURIComponent(reference)}`);

    if (!res.ok) {
      console.error("Failed to fetch payment summary");
      return;
    }

    const data = await res.json();

    if (data && Array.isArray(data.votes) && data.votes.length > 0) {
      const summary = data.votes
        .map(v => `${v.nomineeName} (${v.nomineeVotes} vote(s))`)
        .join(", ");

      alert(`Payment successful! You just voted for: ${summary}`);

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (error) {
    console.error("Error checking payment summary:", error);
  }
});

function startCountdown() {
  // Thursday, March 26, 2026 at 12:00 PM (Africa/Accra / GMT)
  const targetDate = new Date("2026-03-25T14:45:00+00:00").getTime();

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const countdownTime = document.querySelector(".countdownTime");
  const countdownEndText = document.getElementById("countdownEndText");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const pad = (num) => String(num).padStart(2, "0");

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";

      if (countdownTime) countdownTime.style.display = "grid";
      if (countdownEndText) countdownEndText.style.display = "block";

      clearInterval(timer);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);
  }

  updateCountdown();
  const timer = setInterval(updateCountdown, 1000);
}

startCountdown();