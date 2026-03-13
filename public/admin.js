// const loginOverlay = document.getElementById("loginOverlay");
// const loginForm = document.getElementById("loginForm");
// const loginError = document.getElementById("loginError");
// const adminUsername = document.getElementById("adminUsername");
// const adminPassword = document.getElementById("adminPassword");
const searchTrans = document.getElementById("searchTrans");

// function unlockAdmin() {
//     loginOverlay.classList.add("hidden");
//     loadQueue();
//     updateStats();
// }

// async function checkExistingLogin() {
//     try {
//         const res = await fetch('/api/auth/check', { cache: 'no-store' });
//         const data = await res.json();

//         if (data.loggedIn) {
//             unlockAdmin();
//         }
//     } catch (err) {
//         console.error("Login check failed:", err);
//     }
// }

async function loadQueue() {
    const res = await fetch('/api/admin/queue', { cache: 'no-store' });

    if (!res.ok) {
        if (res.status === 403) {
            window.location.href = '/admin-login.html';
            return;
        }
        return;
    }

    const data = await res.json();
    const tbody = document.getElementById('verificationList');

    tbody.innerHTML = data.map(item => `
        <tr>
            <td data-label="Voter Details">
                <div class="voterData">
                    <span class="name">Voter: ${item.voter_phone || item.voter_name || 'Anonymous'}</span>
                    <span class="phone">${item.voter_class || 'N/A'}</span>
                </div>
            </td>
            <td data-label="Nominee">${item.nominee_name || 'Unknown'}</td>
            <td data-label="Votes/Amount">
                <div class="voteData">
                    <span class="voteCountBadge">${item.votes_count} Votes</span>
                    <span class="ghsAmount">GHS ${Number(item.amount_paid || 0).toFixed(2)}</span>
                </div>
            </td>
            <td data-label="MoMo Trans ID"><span class="transBadge">${item.momo_trans_id}</span></td>
            <td data-label="Action">
                <div class="actionButtons">
                    <button class="approveBtn" onclick="updateVote(${item.id}, 'approved')">✓</button>
                    <button class="rejectBtn" onclick="updateVote(${item.id}, 'rejected')">✕</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function updateStats() {
    const res = await fetch('/api/admin/stats', { cache: 'no-store' });

    if (!res.ok) {
        if (res.status === 403) {
            window.location.href = '/admin-login.html';
            return;
        }
        return;
    }

    const stats = await res.json();
    document.getElementById('totalRev').innerText = Number(stats.revenue || 0).toFixed(2);
    document.getElementById('pendingCount').innerText = stats.pendingCount ?? 0;

    const topPending = document.getElementById('topPendingCount');
    if (topPending) {
        topPending.innerText = stats.pendingCount ?? 0;
    }
}

async function updateVote(id, status) {
    const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });

    if (res.ok) {
        await loadQueue();
        await updateStats();
    } else if (res.status === 403) {
        window.location.href = '/admin-login.html';
    }
}



searchTrans?.addEventListener("input", () => {
    loadQueue();
});

loadQueue();
updateStats();