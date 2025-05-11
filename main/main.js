
        // Tự động active tab đang mở
const currentPage = location.pathname.split("/").pop();
const items = document.querySelectorAll(".footer-item");

items.forEach(item => {
  const page = item.getAttribute("data-page");
  if (page === currentPage) {
    item.classList.add("active");
  }
});



    

    document.addEventListener("DOMContentLoaded", function () {
        const savedUser = localStorage.getItem("telegram_user");
        const walletContainer = document.getElementById("wallet-avatar-container");

        if (savedUser) {
            const user = JSON.parse(savedUser);
            walletContainer.innerHTML = `<img src="${user.photo_url}" alt="Wallet" style="width:30px; height:30px; border-radius:50%;">`;
        }
    });









const tg = window.Telegram.WebApp;

    
let balanceTon = 0; // Khai báo biến toàn cục để lưu số dư

const connector = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: "http://bmweb.site//tonconnect-manifest.json",
  buttonRootId: "connect-wallet"
});

    connector.onStatusChange(async (wallet) => {
  if (wallet) {
    // Ẩn phần chờ kết nối, hiện phần nội dung chính
    document.getElementById("connect-only").style.display = "none";
    document.getElementById("main-content").style.display = "block";

    // ... phần còn lại như bạn đã làm
  } else {
    // Nếu mất kết nối hoặc chưa kết nối ví
    document.getElementById("wallet-address").textContent = "...";
    document.getElementById("wallet-address").setAttribute("data-full-address", "");
    document.getElementById("wallet-balance").textContent = "Số dư: ... TON";
    document.getElementById("disconnect").style.display = 'none';
    document.getElementById("main-content").style.display = "none";
    document.getElementById("connect-only").style.display = "flex";
  }
});
