document.getElementById("toggleFormBtn").addEventListener("click", function() {
    document.getElementById("quotationFormContainer").classList.add("show");
});

document.getElementById("closeFormBtn").addEventListener("click", function() {
    document.getElementById("quotationFormContainer").classList.remove("show");
});