// ── CONFIG ─────────────────────────────────────────────────────────
const API = window.location.origin + "/api";
const BORROW_DAYS = 7;

// Hardcoded admin credentials (frontend check — server also validates)
const ADMIN_USERNAME = "bhumika";
const ADMIN_PASSWORD = "bhumi@123";

// ── STATE ──────────────────────────────────────────────────────────
let currentUser = null;

// ── DOM REFS ───────────────────────────────────────────────────────
const loginSection = document.getElementById("login-section");
const mainSection = document.getElementById("main-section");
const contentArea = document.getElementById("content-area");
const btnBrowse = document.getElementById("btn-browse");
const btnMyBooks = document.getElementById("btn-mybooks");
const btnAdmin = document.getElementById("btn-admin");
const btnLogout = document.getElementById("btn-logout");
const roleSelect = document.getElementById("role");
const passwordLabel = document.getElementById("password-label");
const passwordInput = document.getElementById("password");

// Show/hide password field based on role selection
roleSelect.onchange = () => {
  if (roleSelect.value === "admin") {
    passwordLabel.classList.remove("hidden");
    passwordInput.setAttribute("required", "true");
  } else {
    passwordLabel.classList.add("hidden");
    passwordInput.removeAttribute("required");
    passwordInput.value = "";
  }
};

// ── LOGIN ──────────────────────────────────────────────────────────
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const role = roleSelect.value;
  const password = passwordInput.value;

  if (!username) { alert("Please enter a username."); return; }

  // Admin credential check
  if (role === "admin") {
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      alert("❌ Invalid admin username or password.");
      return;
    }
  }

  currentUser = { name: username, role };

  loginSection.classList.add("hidden");
  mainSection.classList.remove("hidden");

  // Hide customer-only sections for admin
  if (role === "admin") {
    btnBrowse.style.display = "none";
    btnMyBooks.style.display = "none";
    btnAdmin.style.display = "inline-block";
    showView("admin");
  } else {
    btnBrowse.style.display = "inline-block";
    btnMyBooks.style.display = "inline-block";
    btnAdmin.style.display = "none";
    showView("browse");
  }
});

// ── NAVIGATION ─────────────────────────────────────────────────────
btnBrowse.onclick = () => showView("browse");
btnMyBooks.onclick = () => showView("mybooks");
btnAdmin.onclick = () => {
  if (currentUser.role !== "admin") { alert("Access Denied"); return; }
  showView("admin");
};
btnLogout.onclick = () => {
  currentUser = null;
  loginSection.classList.remove("hidden");
  mainSection.classList.add("hidden");
  contentArea.innerHTML = "";
  btnBrowse.style.display = "inline-block";
  btnMyBooks.style.display = "inline-block";
  btnAdmin.style.display = "none";
  document.getElementById("login-form").reset();
  passwordLabel.classList.add("hidden");
  roleSelect.value = "customer";
};

// ── UTILITIES ──────────────────────────────────────────────────────
function fmt(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}
function addDays(date, days) {
  let d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ── VIEWS ──────────────────────────────────────────────────────────
function showView(view) {
  if (!currentUser) return;

  if (currentUser.role === "admin" && view !== "admin") {
    alert("Admins cannot access customer borrow views.");
    contentArea.innerHTML = "";
    return renderAdmin();
  }

  if (currentUser.role !== "admin" && view === "admin") {
    alert("Access denied.");
    contentArea.innerHTML = "";
    return renderBrowse();
  }

  contentArea.innerHTML = "";
  if (view === "browse") renderBrowse();
  else if (view === "mybooks") renderMyBooks();
  else if (view === "admin") renderAdmin();
}

// ── BROWSE VIEW (customers) ────────────────────────────────────────
async function renderBrowse() {
  contentArea.innerHTML = `
    <h2>Browse Books</h2>
    <input type="search" id="searchInput" placeholder="Search by title or author" />
    <div id="booksList"></div>
    <h3>Suggest a Book</h3>
    <form id="suggestForm" class="inline">
      <input type="text" id="suggestTitle"  placeholder="Book Title"   required />
      <input type="text" id="suggestAuthor" placeholder="Author Name"  required />
      <button type="submit">Suggest</button>
    </form>`;

  const booksList = document.getElementById("booksList");
  const searchInput = document.getElementById("searchInput");
  let allBooks = [];

  try { allBooks = await api("GET", "/books"); }
  catch (e) { booksList.innerHTML = `<p style="color:red">${e.message}</p>`; return; }

  function displayBooks(filter = "") {
    const filtered = allBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(filter.toLowerCase()) ||
        b.author.toLowerCase().includes(filter.toLowerCase())
    );
    if (!filtered.length) { booksList.innerHTML = "<p>No books found.</p>"; return; }

    booksList.innerHTML = filtered.map((b) => {
      const avail = b.quantity - b.borrowed_count;
      return `
      <div class="book-card">
        <div class="book-info">
          <h3>${b.title}</h3>
          <p>Author: ${b.author}</p>
          <p>Available: ${avail} / ${b.quantity}</p>
        </div>
        <div>
          <button data-id="${b.id}" ${avail <= 0 ? "disabled" : ""}>Borrow</button>
        </div>
      </div>`;
    }).join("");

    booksList.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          await api("POST", "/borrow", { bookId: +btn.dataset.id, username: currentUser.name });
          alert("✅ Book borrowed! Return within 7 days.");
          renderBrowse();
        } catch (e) { alert("❌ " + e.message); }
      };
    });
  }

  searchInput.oninput = () => displayBooks(searchInput.value);

  document.getElementById("suggestForm").onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById("suggestTitle").value.trim();
    const author = document.getElementById("suggestAuthor").value.trim();
    try {
      await api("POST", "/suggestions", { title, author, suggestedBy: currentUser.name });
      alert("✅ Suggestion sent to Admin!");
      e.target.reset();
    } catch (e) { alert("❌ " + e.message); }
  };

  displayBooks();
}

// ── MY BOOKS VIEW (customers) ──────────────────────────────────────
async function renderMyBooks() {
  contentArea.innerHTML = `<h2>My Borrowed Books</h2><div id="myList"></div>`;
  const myList = document.getElementById("myList");

  let myBooks = [];
  try { myBooks = await api("GET", `/borrows/${currentUser.name}`); }
  catch (e) { myList.innerHTML = `<p style="color:red">${e.message}</p>`; return; }

  if (!myBooks.length) {
    myList.innerHTML = "<p>You have not borrowed any books.</p>";
    return;
  }

  myBooks.forEach((b) => {
    const due = addDays(b.borrow_date, BORROW_DAYS);
    const overdue = new Date() > due;
    myList.innerHTML += `
      <div class="book-card">
        <div class="book-info">
          <h3>${b.title}</h3>
          <p>Author: ${b.author}</p>
          <p>Borrowed On: ${fmt(b.borrow_date)}</p>
          <p>Due By: ${fmt(due)}</p>
          <p>Status: <span class="status ${overdue ? "borrowed" : "available"}">
            ${overdue ? "⚠ Overdue" : "✔ On Time"}</span></p>
        </div>
        <button data-id="${b.book_id}">Return</button>
      </div>`;
  });

  myList.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api("POST", "/return", { bookId: +btn.dataset.id, username: currentUser.name });
        alert("✅ Book returned. Thank you!");
        renderMyBooks();
      } catch (e) { alert("❌ " + e.message); }
    };
  });
}

// ── ADMIN PANEL ────────────────────────────────────────────────────
async function renderAdmin() {
  contentArea.innerHTML = `
    <h2>Admin Panel</h2>

    <!-- Add / Update book form -->
    <h3>➕ Add / Update Book</h3>
    <form id="addBookForm" class="inline">
      <input type="hidden"  id="bookId" />
      <input type="text"    id="bookTitle"    placeholder="Book Title"  required />
      <input type="text"    id="bookAuthor"   placeholder="Author Name" required />
      <input type="number"  id="bookQuantity" placeholder="Quantity" min="1" required />
      <button type="submit">Save</button>
      <button type="button" id="cancelUpdate" style="background:#ccc;color:#333;display:none;">Cancel</button>
    </form>

    <!-- Inventory -->
    <h3>📦 Books Inventory</h3>
    <div id="booksInventory"></div>

    <!-- Borrow History (replaces "My Books" section) -->
    <h3>📋 Borrow History (All Users)</h3>
    <div id="borrowHistory"></div>

    <!-- Suggestions -->
    <h3>💡 Suggestions from Customers</h3>
    <div id="suggestionsList"></div>`;

  const addBookForm = document.getElementById("addBookForm");
  const booksInventory = document.getElementById("booksInventory");
  const borrowHistory = document.getElementById("borrowHistory");
  const suggestionsList = document.getElementById("suggestionsList");
  const cancelBtn = document.getElementById("cancelUpdate");

  // ── INVENTORY ──
  async function displayInventory() {
    let books = [];
    try { books = await api("GET", "/books"); } catch (e) { booksInventory.innerHTML = `<p style="color:red">${e.message}</p>`; return; }

    if (!books.length) { booksInventory.innerHTML = "<p>No books in inventory.</p>"; return; }

    booksInventory.innerHTML = books.map((b) => `
      <div class="book-card">
        <div class="book-info">
          <h3>${b.title}</h3>
          <p>Author: ${b.author}</p>
          <p>Total Qty: ${b.quantity} &nbsp;|&nbsp; Borrowed: ${b.borrowed_count} &nbsp;|&nbsp; Available: ${b.quantity - b.borrowed_count}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="edit-btn"   data-id="${b.id}" data-title="${b.title}" data-author="${b.author}" data-qty="${b.quantity}">Edit</button>
          <button class="delete-btn" data-id="${b.id}" style="background:#e63946;">Delete</button>
        </div>
      </div>`).join("");

    booksInventory.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.onclick = () => {
        document.getElementById("bookId").value = btn.dataset.id;
        document.getElementById("bookTitle").value = btn.dataset.title;
        document.getElementById("bookAuthor").value = btn.dataset.author;
        document.getElementById("bookQuantity").value = btn.dataset.qty;
        cancelBtn.style.display = "inline-block";
        addBookForm.scrollIntoView({ behavior: "smooth" });
      };
    });

    booksInventory.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete this book?")) return;
        try {
          await api("DELETE", `/books/${btn.dataset.id}`);
          await displayInventory();
          await displayBorrowHistory();
        } catch (e) { alert("❌ " + e.message); }
      };
    });
  }

  // ── BORROW HISTORY TABLE ──
  async function displayBorrowHistory() {
    let records = [];
    try { records = await api("GET", "/admin/borrows"); }
    catch (e) { borrowHistory.innerHTML = `<p style="color:red">${e.message}</p>`; return; }

    if (!records.length) {
      borrowHistory.innerHTML = "<p>No active borrows at the moment.</p>";
      return;
    }

    borrowHistory.innerHTML = `
      <table class="borrow-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Book Title</th>
            <th>Borrowed By</th>
            <th>Borrow Date</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => {
      const due = addDays(r.borrow_date, BORROW_DAYS);
      const overdue = new Date() > due;
      return `<tr>
              <td>${i + 1}</td>
              <td>${r.title}</td>
              <td>${r.username}</td>
              <td>${fmt(r.borrow_date)}</td>
              <td>${fmt(due)}</td>
              <td><span class="status ${overdue ? "borrowed" : "available"}">${overdue ? "⚠ Overdue" : "✔ Active"}</span></td>
            </tr>`;
    }).join("")}
        </tbody>
      </table>`;
  }

  // ── SUGGESTIONS ──
  async function displaySuggestions() {
    let suggestions = [];
    try { suggestions = await api("GET", "/suggestions"); }
    catch (e) { suggestionsList.innerHTML = `<p style="color:red">${e.message}</p>`; return; }

    if (!suggestions.length) { suggestionsList.innerHTML = "<p>No suggestions yet.</p>"; return; }

    suggestionsList.innerHTML = suggestions.map((s) => `
      <div class="book-card">
        <div class="book-info">
          <h4>${s.title}</h4>
          <p>Author: ${s.author}</p>
          <p>Suggested By: ${s.suggested_by}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="approve-btn" data-id="${s.id}">✅ Add to Library</button>
          <button class="remove-btn"  data-id="${s.id}" style="background:#e63946;">🗑 Remove</button>
        </div>
      </div>`).join("");

    suggestionsList.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.onclick = async () => {
        try {
          await api("POST", `/suggestions/${btn.dataset.id}/approve`);
          alert("✅ Book added to library!");
          await displayInventory();
          await displaySuggestions();
        } catch (e) { alert("❌ " + e.message); }
      };
    });

    suggestionsList.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Remove this suggestion?")) return;
        try {
          await api("DELETE", `/suggestions/${btn.dataset.id}`);
          await displaySuggestions();
        } catch (e) { alert("❌ " + e.message); }
      };
    });
  }

  // ── ADD / UPDATE FORM ──
  addBookForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById("bookId").value;
    const title = document.getElementById("bookTitle").value.trim();
    const author = document.getElementById("bookAuthor").value.trim();
    const quantity = Number(document.getElementById("bookQuantity").value);

    if (!title || !author || quantity <= 0) { alert("Please fill all fields."); return; }

    try {
      if (id) {
        await api("PUT", `/books/${id}`, { title, author, quantity });
        alert("✅ Book updated.");
      } else {
        await api("POST", "/books", { title, author, quantity });
        alert("✅ Book added.");
      }
      addBookForm.reset();
      document.getElementById("bookId").value = "";
      cancelBtn.style.display = "none";
      await displayInventory();
    } catch (e) { alert("❌ " + e.message); }
  };

  cancelBtn.onclick = () => {
    addBookForm.reset();
    document.getElementById("bookId").value = "";
    cancelBtn.style.display = "none";
  };

  // Load all sections
  await displayInventory();
  await displayBorrowHistory();
  await displaySuggestions();
}
