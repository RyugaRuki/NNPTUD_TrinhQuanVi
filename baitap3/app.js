const API_BASE = 'https://api.escuelajs.co/api/v1/products';
let products = [];
let currentPage = 1;
let pageSize = 10;
let detailModal, formModal;

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo các Modal của Bootstrap
    detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    formModal = new bootstrap.Modal(document.getElementById('formModal'));

    // Gán sự kiện tìm kiếm với debounce (chờ 0.5s sau khi gõ xong mới gọi API)
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1;
            fetchData();
        }, 500);
    });

    // Thay đổi số lượng bản ghi mỗi trang
    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        fetchData();
    });

    // Điều hướng phân trang
    document.getElementById('btnPrev').onclick = () => { if(currentPage > 1) { currentPage--; fetchData(); }};
    document.getElementById('btnNext').onclick = () => { currentPage++; fetchData(); };

    // Các nút chức năng khác
    document.getElementById('btnOpenCreate').onclick = openCreateModal;
    document.getElementById('btnSave').onclick = saveProduct;
    document.getElementById('btnExport').onclick = exportCSV;

    // Sắp xếp local (theo Price hoặc Title)
    document.getElementById('headerTitle').onclick = () => sortLocal('title');
    document.getElementById('headerPrice').onclick = () => sortLocal('price');

    fetchData(); 
});

// Hàm lấy dữ liệu từ API (Sử dụng Server-side Pagination để load cực nhanh)
async function fetchData() {
    const loader = document.getElementById('loading');
    const searchVal = document.getElementById('searchInput').value;
    
    loader.classList.remove('d-none'); // Hiện loading

    try {
        const offset = (currentPage - 1) * pageSize;
        let url = `${API_BASE}?offset=${offset}&limit=${pageSize}`;
        if (searchVal) url += `&title=${encodeURIComponent(searchVal)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Không thể kết nối API');
        
        const data = await response.json();
        
        // XỬ LÝ LỖI DỮ LIỆU: API EscuelaJS thường trả về link ảnh lỗi [ "[\"url\"]" ]
        products = data.map(p => ({
            ...p,
            cleanImg: formatImageUrl(p.images)
        }));

        renderTable();
        updatePaginationUI(products.length);

    } catch (error) {
        console.error("Lỗi:", error);
        document.getElementById('productTableBody').innerHTML = 
            `<tr><td colspan="6" class="text-center text-danger">Đã xảy ra lỗi khi tải dữ liệu.</td></tr>`;
    } finally {
        loader.classList.add('d-none'); // Đảm bảo luôn ẩn loading kể cả khi lỗi
    }
}

// Hàm làm sạch URL ảnh
function formatImageUrl(images) {
    if (!images || images.length === 0) return 'https://placehold.co/100';
    let url = images[0];
    // Xóa các ký tự [ ] " \ do lỗi định dạng của API
    url = url.replace(/[\[\]"\\]/g, ''); 
    if (!url.startsWith('http')) return 'https://placehold.co/100';
    return url;
}

function renderTable() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = products.map(p => `
        <tr onclick="viewDetail(${p.id})">
            <td>${p.id}</td>
            <td><img src="${p.cleanImg}" class="product-img" loading="lazy"></td>
            <td class="fw-bold">${p.title}</td>
            <td>$${p.price}</td>
            <td><span class="badge bg-secondary">${p.category?.name || 'N/A'}</span></td>
            <td>
                <button class="btn btn-sm btn-info text-white" onclick="event.stopPropagation(); viewDetail(${p.id})">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Kích hoạt Tooltip hiển thị Description khi hover
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(t => {
        const prod = products.find(p => p.id == t.closest('tr').cells[0].innerText);
        t.title = prod ? prod.description : '';
        new bootstrap.Tooltip(t);
    });
}

function updatePaginationUI(count) {
    document.getElementById('currentPageDisplay').innerText = currentPage;
    document.getElementById('btnPrev').parentElement.classList.toggle('disabled', currentPage === 1);
    // Nếu số lượng lấy về ít hơn giới hạn pageSize thì là trang cuối
    document.getElementById('btnNext').parentElement.classList.toggle('disabled', count < pageSize);
    document.getElementById('pageInfo').innerText = `Trang ${currentPage} - Hiển thị tối đa ${pageSize} sản phẩm`;
}

// --- CHI TIẾT SẢN PHẨM ---
function viewDetail(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;

    document.getElementById('detailId').innerText = p.id;
    document.getElementById('detailTitle').innerText = p.title;
    document.getElementById('detailPrice').innerText = p.price;
    document.getElementById('detailCategory').innerText = p.category?.name || 'N/A';
    document.getElementById('detailDescription').innerText = p.description;
    document.getElementById('detailImage').src = p.cleanImg;

    document.getElementById('btnOpenEditFromDetail').onclick = () => {
        detailModal.hide();
        openEditModal(p);
    };

    detailModal.show();
}

// --- TẠO MỚI & CHỈNH SỬA ---
function openCreateModal() {
    document.getElementById('formModalTitle').innerText = "Tạo Sản Phẩm Mới";
    document.getElementById('productForm').reset();
    document.getElementById('formId').value = '';
    formModal.show();
}

function openEditModal(p) {
    document.getElementById('formModalTitle').innerText = "Cập Nhật Sản Phẩm";
    document.getElementById('formId').value = p.id;
    document.getElementById('formTitle').value = p.title;
    document.getElementById('formPrice').value = p.price;
    document.getElementById('formDescription').value = p.description;
    document.getElementById('formCategoryId').value = p.category?.id || 1;
    document.getElementById('formImage').value = p.images[0];
    formModal.show();
}

async function saveProduct() {
    const id = document.getElementById('formId').value;
    const data = {
        title: document.getElementById('formTitle').value,
        price: parseFloat(document.getElementById('formPrice').value),
        description: document.getElementById('formDescription').value,
        categoryId: parseInt(document.getElementById('formCategoryId').value),
        images: [document.getElementById('formImage').value]
    };

    document.getElementById('loading').classList.remove('d-none');
    formModal.hide();

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/${id}` : API_BASE;

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert(id ? "Cập nhật thành công!" : "Tạo mới thành công!");
            fetchData();
        }
    } catch (e) {
        alert("Có lỗi xảy ra khi lưu dữ liệu!");
    } finally {
        document.getElementById('loading').classList.add('d-none');
    }
}

// --- EXPORT CSV ---
function exportCSV() {
    let csv = "ID,Title,Price,Category\n";
    products.forEach(p => {
        csv += `${p.id},"${p.title}",${p.price},"${p.category?.name}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products.csv";
    link.click();
}

// --- SORT LOCAL ---
let sortState = { key: '', asc: true };
function sortLocal(key) {
    sortState.asc = (sortState.key === key) ? !sortState.asc : true;
    sortState.key = key;

    products.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (sortState.asc) return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    });
    renderTable();
}