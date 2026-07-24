const auctions = [
  {name:"Patek Philippe Nautilus 5711/1R-001",category:"Đồng hồ",image:"assets/watch.jpg",time:"00:08:45",price:"3.250.000.000 đ",bids:28,status:"LIVE"},
  {name:"Nhẫn kim cương 3.01ct D IF GIA",category:"Trang sức",image:"assets/diamond.jpg",time:"00:22:18",price:"780.000.000 đ",bids:16,status:"LIVE"},
  {name:"Mercedes-Benz S450L Luxury 2022",category:"Xe cộ",image:"assets/car.jpg",time:"01:15:30",price:"2.180.000.000 đ",bids:19,status:"LIVE"},
  {name:"Hermès Birkin 30 Togo Gold",category:"Thời trang",image:"assets/bag.jpg",time:"02:05:12",price:"650.000.000 đ",bids:11,status:"LIVE"},
  {name:"iPhone 15 Pro Max 256GB",category:"Điện thoại",image:"assets/iphone.jpg",time:"03:42:09",price:"30.500.000 đ",bids:27,status:"LIVE"},
  {name:"Tranh sơn dầu Phong cảnh Đà Lạt",category:"Nghệ thuật",image:"assets/painting.jpg",time:"05:16:33",price:"120.000.000 đ",bids:8,status:"LIVE"}
];

const grid = document.getElementById("auctionGrid");
function renderAuctions(filter=""){
  grid.innerHTML = auctions.map((a,i)=>`
    <article class="auction-card ${filter && a.category!==filter ? "hidden":""}" data-category="${a.category}">
      <div class="image">
        <img src="${a.image}" alt="${a.name}">
        <span class="badge live">${a.status}</span>
      </div>
      <div class="body">
        <h3>${a.name}</h3>
        <div class="meta"><span class="timer">${a.time}</span><span class="price">${a.price}</span></div>
        <div class="bids">${a.bids} lượt trả giá</div>
        <button class="btn btn-primary bid-card" data-name="${a.name}">🔨 Đặt giá ngay</button>
      </div>
    </article>`).join("");
  document.querySelectorAll(".bid-card").forEach(btn=>{
    btn.addEventListener("click",()=>showToast(`Mở phiên đấu giá: ${btn.dataset.name}`));
  });
}
renderAuctions();

let remaining = 12*60 + 45;
setInterval(()=>{
  remaining = Math.max(0,remaining-1);
  const h = String(Math.floor(remaining/3600)).padStart(2,"0");
  const m = String(Math.floor((remaining%3600)/60)).padStart(2,"0");
  const s = String(remaining%60).padStart(2,"0");
  document.getElementById("hours").textContent=h;
  document.getElementById("minutes").textContent=m;
  document.getElementById("seconds").textContent=s;
},1000);

const toast = document.getElementById("toast");
let toastTimer;
function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove("show"),2500);
}
document.querySelectorAll("[data-toast]").forEach(el=>el.addEventListener("click",()=>showToast(el.dataset.toast)));

document.getElementById("topSearch").addEventListener("submit",e=>{
  e.preventDefault();
  const q=document.getElementById("topSearchInput").value.trim();
  showToast(q ? `Đang tìm: ${q}` : "Hãy nhập từ khóa tìm kiếm");
});

document.getElementById("heroFilter").addEventListener("submit",e=>{
  e.preventDefault();
  const category=document.getElementById("categorySelect").value;
  renderAuctions(category);
  document.getElementById("featured").scrollIntoView({behavior:"smooth"});
  showToast(category ? `Đã lọc danh mục ${category}` : "Đang hiển thị tất cả danh mục");
});

document.querySelectorAll("[data-category]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-category]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    renderAuctions(btn.dataset.category);
    document.getElementById("featured").scrollIntoView({behavior:"smooth"});
  });
});

const bidModal=document.getElementById("bidModal");
document.getElementById("featuredBid").addEventListener("click",()=>bidModal.showModal());
bidModal.addEventListener("close",()=>{
  if(bidModal.returnValue==="confirm") showToast("Đã ghi nhận mức giá demo");
});

document.getElementById("menuBtn").addEventListener("click",()=>{
  document.getElementById("mainNav").classList.toggle("open");
});
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>{
  document.getElementById("mainNav").classList.remove("open");
}));
