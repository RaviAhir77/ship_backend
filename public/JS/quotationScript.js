document.getElementById("toggleFormBtn").addEventListener("click", function() {
    document.getElementById("quotationFormContainer").classList.add("show");
});

document.getElementById("closeFormBtn").addEventListener("click", function() {
    document.getElementById("quotationFormContainer").classList.remove("show");
});

const form = document.getElementById("quotationForm");
const tableBody = document.querySelector(".quotation-table tbody"); 
const quotationIdField = document.getElementById("quotation_id");

document.getElementById("quotationForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    let data = Object.fromEntries(formData.entries());

    // Collect multiple product details manually
    let products = [];
    document.querySelectorAll(".product-block").forEach((block) => {
        const product = {
            product_id: block.querySelector(".productSelect").value,
            quantity: block.querySelector(".quantity").value,
            price: block.querySelector(".price").value,
            total: block.querySelector(".totalPrice").value,
            unit_id: block.querySelector(".unitSelect").value,
            netWeight: block.querySelector(".netWeight").value,
            grossWeight: block.querySelector(".grossWeight").value,
            totalPackage: block.querySelector(".totalPackage").value,
            package_id: block.querySelector(".packageSelect").value
        };
        products.push(product);
    });

    data.products = products; // Add products array to data object

    const isUpdate = !!data.quotation_id;
    const url = isUpdate ? `/quotation/update/${data.quotation_id}` : "/quotation/create";
    const method = isUpdate ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        if (response.ok) {
            if (isUpdate) {
                updateQuotationRow(result.quotation);
            } else {
                addQuotationToTable(result.quotation);
            }
            this.reset();
            document.getElementById("quotationFormContainer").classList.remove("show"); 
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
});

const quotationSelect = document.getElementById("quotationSelect");
let quotationsData = []; // Store globally
let productsData = [];
let unitsData = [];
let packagesData = [];


document.querySelectorAll(".editBtn").forEach(button => {
    button.addEventListener("click", async function () {
        try {
            const id = this.dataset.id;
            console.log('Clicked edit button for ID:', id);

            const response = await fetch(`/quotation?type=json`);
            const data = await response.json(); 
            console.log("Fetched data:", data);

            // ✅ Store globally
            quotationsData = data.quotations || [];
            productsData = data.products || [];
            unitsData = data.units || [];
            packagesData = data.packages || [];

            if (!Array.isArray(quotationsData) || quotationsData.length === 0) {
                alert("No quotations found!");
                return;
            }

            const quotationSelect = document.getElementById("quotationSelect");
            if (!quotationSelect) {
                console.error("quotationSelect dropdown not found!");
                return;
            }

            quotationSelect.innerHTML = '<option value="">-- Select Quotation --</option>';

            quotationsData.forEach(q => {
                const option = document.createElement("option");
                option.value = q.id;
                option.textContent = `Quotation #${q.id} - ${q.Consignee?.name || "Unknown"}`;
                quotationSelect.appendChild(option);
            });

            quotationSelect.value = id;
            quotationSelect.dispatchEvent(new Event("change"));
            console.log('quotation selection value:', quotationSelect.value);

            document.getElementById("quotationFormContainer").classList.add("show");

        } catch (error) {
            console.error("Error fetching quotations:", error);
        }
    });
});

quotationSelect.addEventListener("change", function () {
    const id = this.value;
    console.log("Inside event this id:", id);
    
    if (!id) return;

    console.log("Inside change event, quotationsData:", quotationsData);
    const quotation = quotationsData.find(q => q.id == Number(id));

    if (!quotation) {
        alert("Quotation not found!");
        return;
    }

    console.log("Selected quotation:", quotation);

    const productContainer = document.getElementById("productContainer");
    if (!productContainer) {
        console.error("Product container not found!");
        return;
    }
    productContainer.innerHTML = "";

    if (!quotation.QuotationProducts || !Array.isArray(quotation.QuotationProducts)) {
        console.warn("QuotationProducts is missing or not an array.");
        return;
    }

    // ✅ Ensure all elements exist before setting values
    const setValue = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.value = value;
        else console.warn(`Element ${selector} not found.`);
    };

    setValue("#quotation_id", quotation.id);
    setValue("#date", quotation.date);
    setValue("#consignee_id", quotation.consignee_id);
    setValue("#consignee_address", quotation.Consignee?.address || "");
    setValue("#countrySelect", quotation.country_id);
    setValue("#portSelect", quotation.port_id);
    setValue("[name='currency_id']", quotation.currency_id);
    setValue("[name='conversion_rate']", quotation.conversion_rate);
    setValue("[name='totalNetWeight']", quotation.totalNetWeight);
    setValue("[name='totalGrossWeight']", quotation.totalGrossWeight);
    setValue("[name='total_native']", quotation.total_native);
    setValue("[name='total_inr']", quotation.total_inr);

    // ✅ Clear and populate product container
    // const productContainer = document.getElementById("productContainer");
    // if (!productContainer) {
    //     console.error("Product container not found!");
    //     return;
    // }
    // productContainer.innerHTML = "";

    console.log("log of a quotationProducts:", quotation.QuotationProducts);

    if (!quotation.QuotationProducts || !Array.isArray(quotation.QuotationProducts)) {
        console.warn("QuotationProducts is missing or not an array.");
        return;
    }

    quotation.QuotationProducts.forEach(product => {
        const productBlock = document.createElement("div");
        productBlock.classList.add("product-block");
        console.log("packagesData:", packagesData);
        productBlock.innerHTML = `
            <div>
                <label for="product_id">Select Product:</label>
                <select class="productSelect" name="product_id">
                    <option value="">-- Select Product --</option>
                    ${productsData.map(p => `
                        <option value="${p.id}-0" ${p.id == product.product_id ? "selected" : ""}>
                            ${p.productName}
                        </option>
                        ${(p.variants || []).map(variant => `
                            <option value="${p.id}-${variant.id}" ${variant.id == product.variant_id ? "selected" : ""}>
                                &nbsp;&nbsp;&nbsp;↳ ${p.productName}-${variant.name}
                            </option>
                        `).join("")}
                    `).join("")}
                </select>
            
                <label for="quantity">Quantity:</label>
                <input type="number" step="1" name="quantity" class="quantity" required value="${product.quantity}">
            
                <label for="price">Price:</label>
                <input type="number" step="1" name="price" class="price" required value="${product.price}">
            
                <label for="totalPrice">Total:</label>
                <input type="number" step="1" name="total" class="totalPrice" required readonly disabled value="${product.total}">
            </div>
            
            <div>
                <label for="unit_id">Unit:</label>
                <select name="unit_id" class="unitSelect" required>
                    <option value="">-- Select Unit --</option>
                    ${unitsData.map(unit => `
                        <option value="${unit.id}" ${unit.id == product.unit_id ? "selected" : ""}>
                            ${unit.orderUnit} (${unit.packingUnit})
                        </option>
                    `).join("")}
                </select>

                <label for="netWeight">Net Weight:</label>
                <input type="number" step="0.01" name="netWeight" class="netWeight" required readonly disabled value="${product.net_weight}">
            
                <label for="grossWeight">Gross Weight:</label>
                <input type="number" step="0.01" name="grossWeight" class="grossWeight" required readonly disabled value="${product.gross_weight}">
            
                <label for="totalPackage">Total Package:</label>
                <input type="number" name="totalPackage" class="totalPackage" required value="${product.total_package}">
            
                <label for="package_id">Package:</label>
                <select name="package_id" class="packageSelect" required>
                    <option value="">-- Select Package --</option>
                    ${packagesData.map(pkg => `
                        <option value="${pkg.id}" 
                            data-net-weight="${pkg.netWeight}" 
                            data-gross-weight="${pkg.grossWeight}" 
                            ${pkg.id == product.package_id ? "selected" : ""}>
                            ${pkg.netWeight} (${pkg.grossWeight})
                        </option>
                    `).join("")}
                </select>
            </div>

            <button type="button" class="removeProductBtn">Remove</button>
        `;

        productContainer.appendChild(productBlock);
    });
});


function addQuotationToTable(quotation) {
    
        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", quotation.id);
        newRow.innerHTML = `
            <td>
                <div class="dropdown">
                    <button class="dropdown-toggle" data-id="${quotation.id}">⚙️ Manage</button>
                    <div class="dropdown-menu">
                        <button class="editBtn" data-id="${quotation.id}">✏️ Edit</button>
                        <button class="deleteBtn" data-id="${quotation.id}" style="color: red;">🗑️ Delete</button>
                    </div>
                </div>
            </td>
            <td>
                <div class="dropdown">
                    <button class="dropdown-toggle" data-id="${quotation.id}">⚙️ Doc</button>
                    <div class="dropdown-menu">
                        <button class="doc-icon" data-id="${quotation.id}">📄 View PDF</button>
                        <button class="excelBtn" data-id="${quotation.id}">📊 Export Excel</button>
                        <button class="sendMailBtn" data-id="${quotation.id}">📧 Send Mail</button>
                    </div>
                </div>
            </td>
            <td>${quotation.id}</td>
            <td>${quotation.Consignee.name}</td>
            <td>${quotation.QuotationProducts.map(p => `${p.Product.productName} (${p.quantity})`).join(", ")}</td>
            <td>${quotation.Country.country_name}</td>
            <td>${quotation.Port.portName}</td>
            <td>${quotation.status === "Accepted" ? '<span class="status-accepted">Accepted</span>' : '<span class="status-draft">Draft</span>'}</td>
            <td>${quotation.total_native} (USD)</td>
            <td>${quotation.total_native} (USD)</td>
            <td>${quotation.conversion_rate}</td>
        `;
        document.querySelector(".quotation-table tbody").appendChild(newRow);
        initializeDrowdown();
}

function updateQuotationRow(updatedQuotation) {
    const row = document.querySelector(`tr[data-id="${updatedQuotation.id}"]`);
    if (!row) {
        console.error("Row not found for ID:", updatedQuotation.id);
        return;
    }

    console.log("Updating row with data:", updatedQuotation); // ✅ Debugging check

    row.innerHTML = `
         <td>
            <div class="dropdown">
                <button class="dropdown-toggle" data-id="${updatedQuotation.id}">⚙️ Manage</button>
                <div class="dropdown-menu">
                    <button class="editBtn" data-id="${updatedQuotation.id}">✏️ Edit</button>
                    <button class="deleteBtn" data-id="${updatedQuotation.id}" style="color: red;">🗑️ Delete</button>
                </div>
            </div>
        </td>
        <td>
            <div class="dropdown">
                <button class="dropdown-toggle" data-id="${updatedQuotation.id}">⚙️ Doc</button>
                <div class="dropdown-menu">
                    <button class="doc-icon" data-id="${updatedQuotation.id}">📄 View PDF</button>
                    <button class="excelBtn" data-id="${updatedQuotation.id}">📊 Export Excel</button>
                    <button class="sendMailBtn" data-id="${updatedQuotation.id}">📧 Send Mail</button>
                </div>
            </div>
        </td>
        <td>${updatedQuotation.id}</td>
        <td>${updatedQuotation.Consignee?.name || "Unknown"}</td>
        <td>
            ${(updatedQuotation.QuotationProducts || []).map(product => 
                `${product.Product?.productName || "Unknown"} (${product.quantity || 0})`
            ).join(", ")}
        </td>
        <td>${updatedQuotation.Country?.country_name || "Unknown"}</td>
        <td>${updatedQuotation.Port?.portName || "Unknown"}</td>
        <td>
            ${updatedQuotation.status === "Accepted" 
                ? '<span class="status-accepted">Accepted</span>' 
                : '<span class="status-draft">Draft</span>'}
        </td>
        <td>${updatedQuotation.total_native || 0} (USD)</td>
        <td>${updatedQuotation.total_native || 0} (USD)</td>
        <td>${updatedQuotation.conversion_rate || 1}</td>
    `;

    // ✅ Re-attach event listener to the edit button
    initializeDrowdown();


}

function initializeDrowdown(){
    document.querySelectorAll(".dropdown-toggle").forEach(button => {
        button.removeEventListener('click',toggleDropdown)
        button.addEventListener('click',toggleDropdown)
    });

    document.addEventListener('click',function(event){
        document.querySelectorAll(".dropdown-menu").forEach(menu => {
            if(!menu.contains(event.target) && !menu.previousElementSibling.contains(event.target)){
                menu.style.display = "none"
            }
        })
    });
}

function toggleDropdown(event) {
    event.stopPropagation();
    let dropdownMenu = this.nextElementSibling;
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
}

// iframe generator 
document.querySelectorAll(".doc-icon").forEach(icon => {
    icon.addEventListener("click", async (event) => {
        const quotationId = event.target.getAttribute("data-id");
        
        try {
            const response = await fetch(`/quotation/signUrl/${quotationId}`);
            const data = await response.json();

            if (response.ok) {
                window.open(data.signedUrl, "_blank");
            } else {
                alert("Failed to get PDF URL: " + data.message);
            }
        } catch (error) {
            console.error("Error fetching signed URL:", error);
            alert("Error loading PDF.");
        }
    });
});


document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("pdfModal").style.display = "none";
});

const deleteButtons = document.querySelectorAll(".deleteBtn");

deleteButtons.forEach((button) => {
    button.addEventListener("click", async function () {
        const id = this.getAttribute("data-id");

        // Confirm before deleting
        const confirmDelete = confirm("Are you sure you want to delete this quotation?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/quotation/delete/${id}`, {
                method: "DELETE",
            });

            const result = await response.json();

            if (response.ok) {
                location.reload(); // Reload the page to update the table
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Error deleting quotation:", error);
            alert("An error occurred. Please try again.");
        }
    });
}); 


//excel script
document.querySelectorAll(".excelBtn").forEach(button => {
    button.addEventListener("click", async function () {
        const quotationId = this.getAttribute("data-id");

        try {
            // 🔹 Fetch Presigned Excel URL from the backend
            const response = await fetch(`/quotation/signedExcel/${quotationId}`);
            const data = await response.json();

            console.log("Received response:", data);

            if (data.signedUrl) {
                const fileUrl = data.signedUrl;
                const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`;
                window.open(officeViewerUrl, "_blank");
            } else {
                alert("Failed to generate Excel link.");
            }
        } catch (error) {
            console.error("Error fetching Excel URL:", error);
        }
    });
});

function openExcelViewer(url) {
    let modal = document.getElementById("excelModal");
    let iframe = document.getElementById("excelIframe");

    if (!modal) {
        // 🔹 Create Modal
        modal = document.createElement("div");
        modal.id = "excelModal";
        modal.style.position = "fixed";
        modal.style.top = "10%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, 0)";
        modal.style.width = "80%";
        modal.style.height = "80%";
        modal.style.background = "#fff";
        modal.style.border = "1px solid #ccc";
        modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        modal.style.zIndex = "1000";
        modal.style.display = "flex";
        modal.style.flexDirection = "column";

        // Close Button
        const closeButton = document.createElement("button");
        closeButton.innerText = "Close";
        closeButton.style.alignSelf = "flex-end";
        closeButton.style.margin = "10px";
        closeButton.addEventListener("click", () => {
            document.body.removeChild(modal);
        });

        // 🔹 Create Iframe
        iframe = document.createElement("iframe");
        iframe.id = "excelIframe";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";

        modal.appendChild(closeButton);
        modal.appendChild(iframe);
        document.body.appendChild(modal);
    }

    iframe.src = url;
    modal.style.display = "block";
}

// -------------- mail send javascript ---------

const sendMailPopup = document.getElementById("sendMailPopup");
const overlay = document.getElementById("overlay");
const sendMailForm = document.getElementById("sendMailForm");

// let quotationId = null; 

// Open Popup and Get ID
document.querySelectorAll(".sendMailBtn").forEach(button => {
    button.addEventListener("click", function () {
        quotationId = this.getAttribute("data-id"); // Get the quotation ID
        sendMailPopup.classList.add("show");
        overlay.classList.add("show");
    });
});

// Close Popup when clicking outside
overlay.addEventListener("click", function () {
    sendMailPopup.classList.remove("show");
    overlay.classList.remove("show");
});

// Handle Form Submission
// sendMailForm.addEventListener("submit", async function (event) {
//     event.preventDefault(); // Prevent default form submission

//     console.log('quotation id in a send mail',quotationId)
//     if (!quotationId) {
//         alert("Quotation ID not found!");
//         return;
//     }

//     const formData = new FormData(sendMailForm);
//     const jsonObject = {};
//     formData.forEach((value, key) => {
//         jsonObject[key] = value;
//     });

//     console.log("Converted JSON data:", jsonObject);

//     // console.log('formDatat :' , formData)

//     try {
//         const response = await fetch(`/quotation/sendEmail/${quotationId}`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify(jsonObject)
//         });

//         const result = await response.json();

//         console.log('json response :', result)
//         if (response.ok) {
//             alert("Email Sent Successfully!");
//             sendMailPopup.classList.remove("show");
//             overlay.classList.remove("show");
//         } else {
//             alert("Error: " + result.message);
//         }
//     } catch (error) {
//         console.error("Error sending email:", error);
//         alert("Failed to send email.");
//     }
// });

document.querySelectorAll(".sendMailBtn").forEach((button) => {
    button.addEventListener("click", async function () {
        const quotationId = this.dataset.id;
        console.log("Clicked Quotation ID:", quotationId);

        if (!quotationId) return;

        try {
            const response = await fetch(`/quotation/signUrl/${quotationId}`);
            const result = await response.json();

            if (response.ok && result.signedUrl) {
                const emailAttachmentUrlInput = document.getElementById("emailAttachmentUrl");
                const viewPdfBtn = document.getElementById("viewPdfBtn");
            
                if (emailAttachmentUrlInput && viewPdfBtn) {
                    // Store the URL in a hidden input (not visible to users)
                    emailAttachmentUrlInput.value = result.signedUrl;
            
                    // Keep user-friendly file name
                    viewPdfBtn.textContent = `📄 quotation_Ravi_${quotationId}.pdf`;
            
                    // Open the PDF when clicking the link
                    viewPdfBtn.addEventListener("click", function (event) {
                        event.preventDefault(); // Prevent default link behavior
                        window.open(emailAttachmentUrlInput.value, "_blank");
                    });
                }
            
                // Store quotationId for form submission
                sendMailForm.dataset.quotationId = quotationId;
            } else {
                console.error("Failed to get signed URL");
            }
        } catch (error) {
            console.error("Error fetching signed URL:", error);
        }
    });
});


sendMailForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const quotationId = sendMailForm.dataset.quotationId;
    if (!quotationId) {
        alert("Quotation ID not found!");
        return;
    }

    const formData = new FormData(sendMailForm);

    
    // const generatedPdfUrl = document.getElementById("emailAttachmentUrl")?.value;
    // if (generatedPdfUrl) {
    //     formData.append("emailAttachmentUrl", generatedPdfUrl);
    // }

    try {
        const response = await fetch(`/quotation/sendEmail/${quotationId}`, {
            method: "POST",
            body: formData,
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const result = await response.json();
            if (response.ok) {
                alert("Email Sent Successfully!");
                sendMailPopup.classList.remove("show");
                overlay.classList.remove("show");
            } else {
                alert("Error: " + result.message);
            }
        } else {
            // Log non-JSON response
            const text = await response.text();
            console.error("Unexpected response:", text);
            alert("Unexpected response from server.");
        }
    } catch (error) {
        console.error("Error sending email:", error);
        alert("Failed to send email.");
    }
});
