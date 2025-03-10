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
    const data = Object.fromEntries(formData.entries());
    // console.log('data :',data) 

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
            alert(isUpdate ? "Quotation updated successfully!" : "Quotation created successfully!");
            if (isUpdate) {
                updateQuotationRow(result.quotation);
            } else {
                addQuotationToTable(result.quotation);
            }
            form.reset();
            quotationIdField.value = "";
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

document.querySelectorAll(".editBtn").forEach(button => {
    button.addEventListener("click", async function () {
        try {
            const id = this.dataset.id;
            console.log('this id:', id);

            const response = await fetch(`/quotation/find`);
            quotationsData = await response.json(); // ✅ Store data globally
            console.log("Fetched quotations:", quotationsData);

            if (!Array.isArray(quotationsData) || quotationsData.length === 0) {
                alert("No quotations found!");
                return;
            }

            console.log('quotation selecting:', quotationSelect);
            quotationSelect.innerHTML = '<option value="">-- Select Quotation --</option>'; // ✅ Clear old options

            quotationsData.forEach(q => {
                const option = document.createElement("option");
                option.value = q.id;
                option.textContent = `Quotation #${q.id} - ${q.Consignee.name}`;
                quotationSelect.appendChild(option);
            });

            quotationSelect.value = id;
            quotationSelect.dispatchEvent(new Event("change")); // ✅ Force change event
            console.log('quotation selection value:', quotationSelect.value);

            // ✅ Show the form
            document.getElementById("quotationFormContainer").classList.add("show");

        } catch (error) {
            console.error("Error fetching quotations:", error);
        }
    });
});

quotationSelect.addEventListener("change", function () {
    const id = this.value;
    console.log('inside event this id:', id);

    if (!id) return;

    const quotation = quotationsData.find(q => q.id == Number(id));
    console.log('quotation id:', quotation);

    if (!quotation) {
        alert("Quotation not found!"); // ❌ Previously this was happening
        return;
    }

    console.log("Selected quotation:", quotation);

    document.getElementById("quotation_id").value = quotation.id;
    console.log('big log',document.getElementById("quotation_id").value)
    document.getElementById("date").value = quotation.date;
    document.getElementById("consignee_id").value = quotation.consignee_id;
    document.getElementById("consignee_address").value = quotation.Consignee.address;
    document.getElementById("countrySelect").value = quotation.country_id;
    document.getElementById("portSelect").value = quotation.port_id;
    document.querySelector("[name='currency_id']").value = quotation.currency_id;
    document.querySelector("[name='conversion_rate']").value = quotation.conversion_rate;
    document.querySelector("[name='totalNetWeight']").value = quotation.totalNetWeight;
    document.querySelector("[name='totalGrossWeight']").value = quotation.totalGrossWeight;
    document.querySelector("[name='total_native']").value = quotation.total_native;
    document.querySelector("[name='total_inr']").value = quotation.total_inr;

    // ✅ Clear existing products
    const productContainer = document.getElementById("productContainer");
    productContainer.innerHTML = "";


    quotation.QuotationProducts.forEach(product => {
        const productBlock = document.createElement("div");
        productBlock.classList.add("product-block");

        productBlock.innerHTML = `
            <div>
                <label for="product_id">Select Product:</label>
                <select class="productSelect" name="product_id">
                    <option value="">-- Select Product --</option>
                    <option value="${product.product_id}-0" selected>${product.Product.productName}</option>
                    ${(product.Product.variants || []).map(variant => 
                        `<option value="${product.product_id}-${variant.id}" ${variant.id == product.variant_id ? "selected" : ""}>
                            &nbsp;&nbsp;&nbsp;↳${product.Product.productName}-${variant.name}
                        </option>`
                    ).join("")}
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
                    <option value="${product.unit_id}" selected>
                        ${product.Unit.orderUnit} (${product.Unit.packingUnit})
                    </option>
                </select>

                <label for="netWeight">Net Weight:</label>
                <input type="number" step="0.01" name="netWeight" class="netWeight" required readonly disabled value="${product.net_weight}">
            
                <label for="grossWeight">Gross Weight:</label>
                <input type="number" step="0.01" name="grossWeight" class="grossWeight" required readonly disabled value="${product.gross_weight}">
            
                <label for="totalPackage">Total Package:</label>
                <input type="number" name="totalPackage" class="totalPackage" required value="${product.total_package}">
            
                <label for="package_id">Package:</label>
                <select name="package_id" class="packageSelect" required>
                    <option value="${product.package_id}" selected>${product.package_id}</option>
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
                <button class="editBtn" data-id="${quotation.id}">Edit</button>
            </td>
            <td><i class="doc-icon">📄</i></td>
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
}

function updateQuotationRow(updatedQuotation) {
    const row = document.querySelector(`tr[data-id="${updatedQuotation.id}"]`);
    if (!row) return;

    row.innerHTML = `
        <td>
            <button class="editBtn" data-id="${updatedQuotation.id}">Edit</button>
        </td>
        <td>
            <i class="doc-icon">📄</i>
        </td>
        <td>${updatedQuotation.id}</td>
        <td>${updatedQuotation.Consignee.name}</td>
        <td>
            ${updatedQuotation.QuotationProducts.map(product => 
                `${product.Product.productName} (${product.quantity})`
            ).join(", ")}
        </td>
        <td>${updatedQuotation.Country.country_name}</td>
        <td>${updatedQuotation.Port.portName}</td>
        <td>
            ${updatedQuotation.status === "Accepted" 
                ? '<span class="status-accepted">Accepted</span>' 
                : '<span class="status-draft">Draft</span>'}
        </td>
        <td>${updatedQuotation.total_native} (USD)</td>
        <td>${updatedQuotation.total_native} (USD)</td>
        <td>${updatedQuotation.conversion_rate}</td>
    `;

    // ✅ Re-attach the edit button event listener
    row.querySelector(".editBtn").addEventListener("click", function () {
        document.querySelector(`button[data-id="${updatedQuotation.id}"]`).click();
    });
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

// Close modal when clicking on the close button
document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("pdfModal").style.display = "none";
});