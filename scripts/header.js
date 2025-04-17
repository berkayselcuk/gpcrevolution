// scripts/header.js

// Load receptor names from JSON file for autocomplete
async function loadReceptorNames() {
    try {
        const response = await fetch('receptors.json');
        const receptors = await response.json();
        const receptorNames = receptors.map(receptor => receptor.geneName);

        autocomplete(document.getElementById("search-box"), receptorNames);
    } catch (error) {
        console.error('Error loading receptor names:', error);
    }
}

// Autocomplete functionality
function autocomplete(input, array) {
    let currentFocus;
    input.addEventListener("input", function(e) {
        let a, b, i, val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;
        a = document.createElement("div");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);
        for (i = 0; i < array.length; i++) {
            if (array[i].substr(0, val.length).toUpperCase() === val.toUpperCase()) {
                b = document.createElement("div");
                b.innerHTML = "<strong>" + array[i].substr(0, val.length) + "</strong>";
                b.innerHTML += array[i].substr(val.length);
                b.innerHTML += "<input type='hidden' value='" + array[i] + "'>";
                b.addEventListener("click", function(e) {
                    input.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();
                    searchReceptor(); // Perform search on click
                });
                a.appendChild(b);
            }
        }
    });

    input.addEventListener("keydown", function(e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode === 40) {
            currentFocus++;
            addActive(x);
        } else if (e.keyCode === 38) {
            currentFocus--;
            addActive(x);
        } else if (e.keyCode === 13) {
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = x.length - 1;
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        let x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt !== x[i] && elmnt !== input) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function(e) {
        closeAllLists(e.target);
    });
}

// Redirect to receptor detail page
function searchReceptor() {
    const searchQuery = document.getElementById("search-box").value.trim();
    if (!searchQuery) {
        alert("Please enter a receptor name.");
        return;
    }

    window.location.href = `receptor.html?gene=${encodeURIComponent(searchQuery)}`;
}

// Load header and initialize functionalities
function loadHeader() {
    fetch('header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
            // Load external CSS for header
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'styles/header.css';
            document.head.appendChild(link);
            // Load header JavaScript
            const script = document.createElement('script');
            script.src = 'scripts/header.js';
            document.body.appendChild(script);
            // Initialize receptor names after header is loaded
            script.onload = loadReceptorNames;
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
}

// Load the header when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadHeader);
