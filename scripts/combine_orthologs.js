// scripts/combine_orthologs.js

// Constants
const ALIGNMENT_DIR = "alignments"; // Adjust the path as necessary
const receptorsJsonPath = "receptors.json"; // Path to the JSON file

// DOM Elements
const receptorListInput = document.getElementById("receptorList"); // Input for receptor list
const resultDiv = document.getElementById("result");
const combineOrthologsForm = document.getElementById("combine-orthologs-form");

// Variable to store receptors data
let receptorsData = [];

/**
 * Initializes the application by loading receptor names and setting up autocomplete.
 */
async function combineOrthologs_initializeApp() {
    await combineOrthologs_loadReceptorNames();
    combineOrthologs_setupAutocomplete(receptorListInput, "receptorList-autocomplete-list", true); // Multiple selections
}

/**
 * Fetches receptor names from the JSON file and stores them.
 */
async function combineOrthologs_loadReceptorNames() {
    try {
        const response = await fetch(receptorsJsonPath);
        if (!response.ok) throw new Error(`Failed to fetch ${receptorsJsonPath}`);
        const receptors = await response.json();
        receptorsData = receptors; // Store for later use

        console.log("Receptor names loaded successfully:", receptorsData);
    } catch (error) {
        console.error('Error loading receptor names:', error);
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error loading receptor names. Please try again later.</div>";
    }
}

/**
 * Sets up autocomplete functionality for a given input field.
 * @param {HTMLElement} input - The input element to apply autocomplete.
 * @param {string} listId - The ID of the autocomplete list container.
 * @param {boolean} allowMultiple - Whether to allow multiple selections.
 */
function combineOrthologs_setupAutocomplete(input, listId, allowMultiple = false) {
    let currentFocus = -1;

    input.addEventListener("input", function(e) {
        const val = allowMultiple ? this.value.split(',').pop().trim() : this.value;
        combineOrthologs_closeAllLists(listId);
        if (!val) return false;
        currentFocus = -1;

        const a = document.getElementById(listId);
        if (!a) return false;

        // Clear any existing suggestions
        a.innerHTML = "";

        // Filter receptors based on the input value (case-insensitive)
        const filteredReceptors = receptorsData.filter(receptor =>
            receptor.geneName.toUpperCase().startsWith(val.toUpperCase())
        );

        if (filteredReceptors.length === 0) return false;

        // Create suggestion items
        filteredReceptors.forEach(receptor => {
            const b = document.createElement("div");
            const strong = document.createElement("strong");
            strong.innerText = receptor.geneName.substr(0, val.length);
            b.appendChild(strong);
            b.innerHTML += receptor.geneName.substr(val.length);
            // Use a data attribute to store the gene name
            b.setAttribute('data-value', receptor.geneName);
            b.classList.add('co-autocomplete-item'); // Updated class name

            a.appendChild(b);
        });
    });

    input.addEventListener("keydown", function(e) {
        const a = document.getElementById(listId);
        if (a) var x = a.getElementsByTagName("div");
        if (e.keyCode === 40) { // Down key
            currentFocus++;
            combineOrthologs_addActive(x, currentFocus);
        } else if (e.keyCode === 38) { // Up key
            currentFocus--;
            combineOrthologs_addActive(x, currentFocus);
        } else if (e.keyCode === 13) { // Enter key
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    // Handle click events on suggestion items using event delegation
    const a = document.getElementById(listId);
    a.addEventListener("click", function(e) {
        if (e.target && e.target.matches("div.co-autocomplete-item")) { // Updated class name
            const selectedValue = e.target.getAttribute('data-value');
            let currentValue = input.value;

            if (allowMultiple) {
                const parts = currentValue.split(',');
                parts.pop(); // Remove the last incomplete entry
                currentValue = parts.join(', ') + (parts.length > 0 ? ', ' : '') + selectedValue + ', ';
            } else {
                currentValue = selectedValue;
            }

            input.value = currentValue;
            a.innerHTML = ""; // Close the dropdown by clearing the list
            currentFocus = -1; // Reset the focus index
            input.focus(); // Focus back on the input for further selections
        }
    });

    // Close the autocomplete list when clicking outside
    document.addEventListener("click", function (e) {
        if (e.target !== input) {
            combineOrthologs_closeAllLists(listId);
        }
    });
}


/**
 * Adds the "active" class to the currently focused item.
 * @param {HTMLCollection} x - Collection of suggestion items.
 * @param {number} currentFocus - The current focus index.
 */
function combineOrthologs_addActive(x, currentFocus) {
    if (!x) return false;
    combineOrthologs_removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    x[currentFocus].classList.add("co-autocomplete-active"); // Updated class name
}


/**
 * Removes the "active" class from all suggestion items.
 * @param {HTMLCollection} x - Collection of suggestion items.
 */
function combineOrthologs_removeActive(x) {
    for (let i = 0; i < x.length; i++) {
        x[i].classList.remove("co-autocomplete-active"); // Updated class name
    }
}


/**
 * Closes all autocomplete lists except the current one.
 * @param {string} listId - The ID of the autocomplete list container to keep open.
 */
function combineOrthologs_closeAllLists(listId) {
    const items = document.getElementsByClassName("co-autocomplete-items");
    for (let i = 0; i < items.length; i++) {
        if (items[i].id !== listId) {
            items[i].innerHTML = "";
        }
    }
}


/**
 * Handles the form submission for combining orthologous alignments.
 * @param {Event} event - The form submission event.
 */
async function combineOrthologs_handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission

    const receptorListValue = receptorListInput.value.trim();
    if (!receptorListValue) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please enter at least one receptor name.</div>";
        return;
    }

    // Parse receptor names
    const receptorNames = receptorListValue.split(',').map(name => name.trim()).filter(name => name !== '');

    // Remove duplicates
    const uniqueReceptorNames = [...new Set(receptorNames)];

    // Basic validation
    if (uniqueReceptorNames.length === 0) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please enter valid receptor names, separated by commas.</div>";
        return;
    }

    // Retrieve receptor data for the input receptors
    const selectedReceptors = uniqueReceptorNames.map(name => 
        receptorsData.find(r => r.geneName.toLowerCase() === name.toLowerCase())
    );

    // Check if all receptors are found
    if (selectedReceptors.includes(undefined)) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: One or more receptor names not found.</div>";
        console.error("Receptor data not found for:", uniqueReceptorNames);
        return;
    }

    // Ensure all receptors are in the same class
    const receptorClass = selectedReceptors[0].class;
    const allSameClass = selectedReceptors.every(r => r.class === receptorClass);
    if (!allSameClass) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: All receptors must belong to the same class.</div>";
        console.error("Mismatched classes among selected receptors.");
        return;
    }

    // File path using class information
    const fastaFilePath = `${ALIGNMENT_DIR}/class${receptorClass}_humans_MSA.fasta`;

    try {


        // Fetch and process alignment data
        const sequences = await combineOrthologs_readFastaFile(fastaFilePath, uniqueReceptorNames);

        // Extract sequences for selected receptors
        let receptorSequences = selectedReceptors.map(r => {
            const seqData = sequences[r.geneName];
            if (!seqData || !seqData.sequence) {
                throw new Error(`Sequence for ${r.geneName} not found or empty in the FASTA file.`);
            }
            // Normalize gap characters and remove any non-standard characters
            const normalizedSequence = seqData.sequence.toUpperCase().replace(/[^A-Z\-]/g, '');
            return { 
                geneName: r.geneName, 
                header: seqData.header, 
                sequence: normalizedSequence 
            };
        });

        console.log("Original Sequences:", receptorSequences);

        // Trim positions where all sequences have gaps
        if (receptorSequences.length >= 2) {
            receptorSequences = trimGapsInAllSequences(receptorSequences);
        } else {
            console.warn("Trimming is not applicable for a single sequence.");
            // No trimming needed for a single sequence
        }

        console.log("Trimmed Sequences with Full Headers:", receptorSequences);

        // Verify trimmed sequences
        const allSequencesTrimmed = receptorSequences.every(r => r.sequence.length === 0);
        if (allSequencesTrimmed) {
            resultDiv.innerHTML = "<div class='alert alert-danger'>All positions have been trimmed. Please check your input sequences.</div>";
            console.error("All positions were trimmed. No data remains.");
            return;
        }

        // Proceed to Ortholog Alignment Processing
        await combineOrthologs_processOrthologAlignments(receptorSequences);

    } catch (error) {
        resultDiv.innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
        console.error(error);
    }
}

/**
 * Reads aligned sequences from a FASTA file.
 * Parses headers to retain full headers and filters based on input list.
 * @param {string} fastaFilePath - Path to the FASTA file
 * @param {Array<string>} receptorList - Array of receptor gene names to include
 * @returns {Promise<Object>} - Promise resolving to an object mapping gene names to their full headers and sequences
 */
function combineOrthologs_readFastaFile(fastaFilePath, receptorList) {
    return fetch(fastaFilePath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch ${fastaFilePath}`);
            return response.text();
        })
        .then(fastaData => {
            const sequences = {};
            let currentGeneName = null;
            let fullHeader = '';

            fastaData.split("\n").forEach(line => {
                if (line.startsWith(">")) {
                    // Store the full header
                    fullHeader = line.slice(1).trim();
                    // Attempt to extract the gene name for filtering
                    const parts = fullHeader.split("|");
                    if (parts.length >= 3) {
                        const genePart = parts[2].split("_")[0];
                        if (receptorList.includes(genePart)) {
                            currentGeneName = genePart;
                            sequences[currentGeneName] = {
                                header: fullHeader.split("/")[0],
                                sequence: ""
                            };
                            console.log(`Parsed header: ${currentGeneName} (${fullHeader})`); // Debugging
                        } else {
                            currentGeneName = null; // Skip sequences not in the input list
                        }
                    } else {
                        console.warn(`Unexpected FASTA header format: ${line}`);
                        currentGeneName = null;
                    }
                } else if (currentGeneName) {
                    // Remove any whitespace and ensure uppercase letters
                    const cleanLine = line.trim().toUpperCase().replace(/[^A-Z\-]/g, '');
                    sequences[currentGeneName].sequence += cleanLine;
                }
            });

            console.log("Filtered Sequences with Full Headers:", sequences); // Debugging
            return sequences;
        });
}

/**
 * Trims all positions where all sequences have gaps.
 * @param {Array<Object>} receptors - Array of receptor objects with geneName, header, and sequence.
 * @returns {Array<Object>} - Array of receptor objects with trimmed sequences.
 */
function trimGapsInAllSequences(receptors) {
    if (receptors.length === 0) return receptors;

    const sequenceLength = receptors[0].sequence.length;

    // Validate that all sequences are of the same length
    for (let receptor of receptors) {
        if (receptor.sequence.length !== sequenceLength) {
            throw new Error(`Sequence length mismatch for receptor ${receptor.geneName}.`);
        }
    }

    let positionsToKeep = [];

    for (let i = 0; i < sequenceLength; i++) {
        // Check if all sequences have a gap at this position
        const allGaps = receptors.every(receptor => receptor.sequence[i] === '-');
        if (!allGaps) {
            positionsToKeep.push(i);
        }
    }

    console.log(`Positions to keep (${positionsToKeep.length}):`, positionsToKeep);

    // Trim sequences based on positionsToKeep
    const trimmedReceptors = receptors.map(receptor => {
        let trimmedSeq = '';
        positionsToKeep.forEach(pos => {
            trimmedSeq += receptor.sequence[pos];
        });
        return { ...receptor, sequence: trimmedSeq };
    });

    return trimmedReceptors;
}

/**
 * Adjusts orthologous sequences based on the filtered human sequence.
 * Inserts gaps where the human filtered sequence has gaps and retains residues.
 * @param {string} filteredHumanSeq - The filtered human sequence from the first analysis.
 * @param {Array<Object>} orthologSequences - Array of orthologous sequence objects {id, header, sequence}.
 * @returns {Array<Object>} - Array of adjusted orthologous sequence objects {id, header, sequence}.
 */
function adjustedOrthologSequences(filteredHumanSeq, orthologSequences) {
    const finalSequences = orthologSequences.map(ortholog => {
        let adjustedSeq = '';
        for (let i = 0; i < filteredHumanSeq.length; i++) {
            if (filteredHumanSeq[i] === '-') {
                adjustedSeq += '-';
            } else {
                adjustedSeq += ortholog.sequence[i] || '-'; // Add residue or gap if undefined
            }
        }
        return { id: ortholog.id, header: ortholog.header, sequence: adjustedSeq }; // Ensure header is included
    });
    return finalSequences;
}

/**
 * Generates a FASTA formatted string from an array of sequence objects.
 * @param {Array<Object>} sequences - Array of sequence objects {id, header, sequence}.
 * @returns {string} - FASTA formatted string.
 */
function generateFastaString(sequences) {
    return sequences.map(seq => `>${seq.header}\n${seq.sequence}`).join("\n");
}

/**
 * Displays the final orthologous sequences in the resultDiv.
 * @param {Array<Object>} finalOrthologSequences - Array of orthologous sequence objects {id, header, sequence}.
 * @param {string} receptorGeneName - The gene name of the receptor being processed.
 */
function displayFinalOrthologSequences(finalOrthologSequences, receptorGeneName) {
    if (finalOrthologSequences.length === 0) {
        resultDiv.innerHTML += `<div class='alert alert-info'>No orthologous sequences to display for ${receptorGeneName}.</div>`;
        return;
    }

    // Create a container for sequences
    const sequencesContainer = document.createElement("div");
    sequencesContainer.classList.add("mt-3");

    // Add a header for the receptor
    const header = document.createElement("h5");
    header.textContent = `Orthologous Sequences for ${receptorGeneName}:`;
    sequencesContainer.appendChild(header);

    finalOrthologSequences.forEach(seq => {
        const sequenceBlock = document.createElement("pre");
        sequenceBlock.textContent = `${seq.header}\n${seq.sequence}`;
        sequencesContainer.appendChild(sequenceBlock);
    });

    // Append to resultDiv
    resultDiv.appendChild(sequencesContainer);
}

/**
 * Processes orthologous alignments for each receptor based on the filtered sequences.
 * @param {Array<Object>} receptorSequences - Array of receptor objects with geneName, header, and trimmed sequence.
 */
async function combineOrthologs_processOrthologAlignments(receptorSequences) {
    let combinedSequences = []; // Initialize combined sequences array

    // Iterate over each receptor to process its orthologous alignment
    for (let receptor of receptorSequences) {
        const receptorData = receptorsData.find(r => r.geneName.toLowerCase() === receptor.geneName.toLowerCase());
        if (!receptorData || !receptorData.alignment) {
            console.warn(`No alignment found for receptor ${receptor.geneName}. Skipping.`);
            continue;
        }

        const orthologAlignmentPath = receptorData.alignment;

        try {
            console.log(`Processing orthologous alignment for ${receptor.geneName} from ${orthologAlignmentPath}`);
            const orthologSequences = await combineOrthologs_readOrthologousAlignment(orthologAlignmentPath);

            // Use the exact header from the filtered sequences to find the human sequence in orthologous alignment
            const humanHeader = receptor.header;
            const humanOrthologSeqObj = orthologSequences.find(seq => seq.header === humanHeader);
            if (!humanOrthologSeqObj) {
                console.warn(`Human sequence with header "${humanHeader}" not found in orthologous alignment for ${receptor.geneName}. Skipping.`);
                continue;
            }

            // Identify non-gap positions in the human orthologous sequence
            const nonGapPositions = [];
            for (let i = 0; i < humanOrthologSeqObj.sequence.length; i++) {
                if (humanOrthologSeqObj.sequence[i] !== '-') {
                    nonGapPositions.push(i);
                }
            }

            console.log(`Non-gap positions in human orthologous sequence for ${receptor.geneName}:`, nonGapPositions);

            // Trim orthologous sequences based on non-gap positions
            const trimmedOrthologSequences = orthologSequences.map(seq => {
                const trimmedSeq = nonGapPositions.map(pos => seq.sequence[pos] || '-').join('');
                return { id: seq.id, header: seq.header, sequence: trimmedSeq };
            });

            console.log(`Trimmed Orthologous Sequences for ${receptor.geneName}:`, trimmedOrthologSequences);

            // Adjust orthologous sequences based on the filtered human sequence
            const finalOrthologSequences = adjustedOrthologSequences(
                receptor.sequence,
                trimmedOrthologSequences
            );

            console.log(`Final Orthologous Sequences for ${receptor.geneName}:`, finalOrthologSequences);

            // Display the final orthologous sequences in the UI
            //displayFinalOrthologSequences(finalOrthologSequences, receptor.geneName);

            // Collect sequences for combined FASTA
            combinedSequences.push(...finalOrthologSequences); // Addition: Collect sequences

        } catch (error) {
            console.error(`Error processing orthologous alignment for ${receptor.geneName}:`, error);
            // Optionally, inform the user
            resultDiv.innerHTML += `<div class='alert alert-danger'>Error processing orthologous alignment for ${receptor.geneName}: ${error.message}</div>`;
        }
    }

    

    // After processing all receptors, generate combined FASTA
    const fastaString = generateFastaString(combinedSequences); // Generate FASTA string

    // Generate filename based on gene names
    const geneNames = receptorSequences.map(r => r.geneName).join("-");
    const filename = `${geneNames}_orthologs_combined.fasta`;

    // Create a Blob from the FASTA string
    const blob = new Blob([fastaString], { type: "text/fasta" });
    
    // Remove any existing download buttons with the id "combined-fasta-download"
    document.querySelectorAll("#combined-fasta-download").forEach(btn => btn.remove());

    // Create a download link styled as a button
    const downloadLink = document.createElement("a");
    downloadLink.id = "combined-fasta-download"; // Set an ID so we can remove duplicates
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    downloadLink.textContent = "Download Combined Orthologous Alignment";
    downloadLink.classList.add("btn", "btn-primary", "mt-3"); // Use your button styling
    resultDiv.appendChild(downloadLink);

    // Revoke the object URL after some time to free memory
    setTimeout(() => URL.revokeObjectURL(downloadLink.href), 10000);

    // Call the new basic MSA visualization function to render the combined alignment
    if (window.initBasicMSA) {
        initBasicMSA(fastaString);
    }
}

/**
 * Reads orthologous alignment FASTA file and parses it.
 * @param {string} alignmentPath - Path to the orthologous alignment FASTA file.
 * @returns {Promise<Array<Object>>} - Promise resolving to an array of sequence objects {id, header, sequence}.
 */
function combineOrthologs_readOrthologousAlignment(alignmentPath) {
    return fetch(alignmentPath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch ${alignmentPath}`);
            return response.text();
        })
        .then(fastaData => {
            const sequences = [];
            let currentId = '';
            let currentHeader = '';
            let currentSeq = '';

            fastaData.split("\n").forEach(line => {
                if (line.startsWith(">")) {
                    // Push the previous sequence if exists
                    if (currentId) {
                        sequences.push({ id: currentId, header: currentHeader, sequence: currentSeq });
                    }
                    // Start a new sequence
                    currentHeader = line.slice(1).trim();
                    // Assuming the ID is the first word in the header
                    currentId = currentHeader.split(/\s+/)[0];
                    currentSeq = '';
                } else {
                    // Normalize sequence: uppercase and remove non-standard characters
                    const cleanLine = line.trim().toUpperCase().replace(/[^A-Z\-]/g, '');
                    currentSeq += cleanLine;
                }
            });

            // Push the last sequence
            if (currentId) {
                sequences.push({ id: currentId, header: currentHeader, sequence: currentSeq });
            }

            console.log(`Parsed orthologous alignment from ${alignmentPath}:`, sequences);
            return sequences;
        });
}

// ... [existing code above] ...

/**
 * Adjusts orthologous sequences to align with the main alignment's trimmed sequence.
 * Inserts gaps in orthologous sequences wherever the main alignment has gaps.
 * Retains residues from orthologous sequences where the main alignment has residues.
 * @param {string} mainTrimmedSeq - The main alignment's trimmed sequence.
 * @param {Array<Object>} orthologSequences - Array of orthologous sequence objects {id, header, sequence}.
 * @returns {Array<Object>} - Array of adjusted orthologous sequence objects {id, header, sequence}.
 */
function adjustedOrthologSequences(mainTrimmedSeq, orthologSequences) {
    return orthologSequences.map(ortholog => {
        let adjustedSeq = '';
        let orthologIndex = 0; // Pointer to iterate through the ortholog's sequence

        for (let i = 0; i < mainTrimmedSeq.length; i++) {
            if (mainTrimmedSeq[i] === '-') {
                // Insert a gap in the orthologous sequence
                adjustedSeq += '-';
            } else {
                // Insert the next residue from the orthologous sequence
                adjustedSeq += ortholog.sequence[orthologIndex] || '-'; // Use '-' if undefined
                orthologIndex++;
            }
        }

        return { id: ortholog.id, header: ortholog.header, sequence: adjustedSeq };
    });
}


/**
 * Displays the final orthologous sequences in the resultDiv.
 * @param {Array<Object>} finalOrthologSequences - Array of orthologous sequence objects {id, header, sequence}.
 * @param {string} receptorGeneName - The gene name of the receptor being processed.
 */
function displayFinalOrthologSequences(finalOrthologSequences, receptorGeneName) {
    if (finalOrthologSequences.length === 0) {
        resultDiv.innerHTML += `<div class='alert alert-info'>No orthologous sequences to display for ${receptorGeneName}.</div>`;
        return;
    }

    // Create a container for sequences
    const sequencesContainer = document.createElement("div");
    sequencesContainer.classList.add("mt-3");

    // Add a header for the receptor
    const header = document.createElement("h5");
    header.textContent = `Orthologous Sequences for ${receptorGeneName}:`;
    sequencesContainer.appendChild(header);

    finalOrthologSequences.forEach(seq => {
        const sequenceBlock = document.createElement("pre");
        sequenceBlock.textContent = `${seq.header}\n${seq.sequence}`;
        sequencesContainer.appendChild(sequenceBlock);
    });

    // Append to resultDiv
    resultDiv.appendChild(sequencesContainer);
}

// Assign the event listener to the form
combineOrthologsForm.addEventListener("submit", combineOrthologs_handleFormSubmit);

/**
 * Initializes the application when the DOM is fully loaded.
 */
document.addEventListener("DOMContentLoaded", combineOrthologs_initializeApp);
