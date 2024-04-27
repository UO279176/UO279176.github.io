import { Square } from "./Square.js";
import * as Constants from "./Constants.js";
import { Chronometer } from "./Chronometer.js";
import { KonamiCode } from "./KonamiCode.js";

document.addEventListener("DOMContentLoaded", function() { // Cargar JS cuando el DOM esté listo
    const canvas = document.querySelector("canvas.board");
    const ctx = canvas.getContext("2d");
    const $spriteSquares = document.querySelector("#spriteSquares");

    const chronoText = document.querySelector(".chronometer");
    const chronoObj = new Chronometer();
    const selDifficulty = document.querySelector("#difficultySelect");
    const cbExperimental = document.querySelector("#cbExpOpt");
    const inputName = document.querySelector("#inputName");

    const konamiCode = new KonamiCode();
    konamiCode.addListener();

    let boardWidth = 9;
    let boardHeight = 9;
    let numOfMines = 10;
    let boardGenerated = false;
    let isLeftPressed = false; // ¿Click izquierdo presionado?
    let isRightPressed = false; // ¿Click derecho presionado?
    let board = [];
    let nameSelected = ""; // Se guarda el nombre del jugador al empezar la partida para evitar cambios en mitad de la partida
    let isGameOver = false; // ¿Se ha terminado la partida? (ganado o perdido)
    let isSubmittingScore = false; // ¿Se está subiendo la puntuación al servidor?
    let isGameWon = false; // ¿Se ha ganado la partida?

    function initializeBoard() {
        console.log("Initializing board...");
        initEvents();
        canvas.width = Constants.SQUARE_SIZE * boardWidth;
        canvas.height = Constants.SQUARE_SIZE * boardHeight;
        ctx.imageSmoothingEnabled = false; // Desactivar suavizado de imágenes
        
        boardGenerated = false;
        board = []; // Limpiar el tablero
        for (let i = 0; i < boardHeight; i++) {
            board[i] = [];
            for (let j = 0; j < boardWidth; j++) {
                board[i][j] = new Square(i, j, 0, false, false);
            }
        }
    }

    function drawBoard() {
        console.log("Drawing board...");
        for (let i = 0; i < boardHeight; i++) {
            for (let j = 0; j < boardWidth; j++) {
                const square = board[i][j];

                // 1. Dibujamos el revelado
                ctx.drawImage(
                    $spriteSquares,
                    (square.revealed && square.content === Constants.MINE_ID ?
                        Constants.SQUARE_TYPES.REVEALED_MINE :
                        square.revealed ?
                            Constants.SQUARE_TYPES.REVEALED :
                            Constants.SQUARE_TYPES.UNREVEALED
                    ) * Constants.IMG_SQUARE_SIZE, // Posición X del cuadrado en la imagen
                    0, // Posición Y del cuadrado en la imagen
                    Constants.IMG_SQUARE_SIZE, // An cho del cuadrado en la imagen
                    Constants.IMG_SQUARE_SIZE, // Alto del cuadrado en la imagen
                    j * Constants.SQUARE_SIZE, // Posición X del cuadrado
                    i * Constants.SQUARE_SIZE, // Posición Y del cuadrado
                    Constants.SQUARE_SIZE, // Ancho del cuadrado
                    Constants.SQUARE_SIZE // Alto del cuadrado
                );

                // 2. Si es revelado, dibujamos el contenido, si no, dibujamos si está con bandera o no
                if (square.revealed) {
                    // Cuando se revela un cuadrado, hay 3 opciones: un vacío (0), un número (1-8) o una mina
                    if (square.content !== 0) { // El número 0 no se dibuja
                        ctx.drawImage(
                            $spriteSquares,
                            Constants.NUMBER_TO_TYPE[square.content] * Constants.IMG_SQUARE_SIZE, // Posición X del cuadrado en la imagen
                            0, // Posición Y del cuadrado en la imagen
                            Constants.IMG_SQUARE_SIZE, // An cho del cuadrado en la imagen
                            Constants.IMG_SQUARE_SIZE, // Alto del cuadrado en la imagen
                            j * Constants.SQUARE_SIZE, // Posición X del cuadrado
                            i * Constants.SQUARE_SIZE, // Posición Y del cuadrado
                            Constants.SQUARE_SIZE, // Ancho del cuadrado
                            Constants.SQUARE_SIZE // Alto del cuadrado
                        );
                    }
                }
                else if (!square.revealed && square.flagged) {
                    ctx.drawImage(
                        $spriteSquares,
                        (isGameOver && square.content === Constants.MINE_ID ?
                            Constants.SQUARE_TYPES.FLAG_RIGHT : // La bandera aparece de otro color si está bien colocada y se ha perdido la partida
                            Constants.SQUARE_TYPES.FLAG
                        ) * Constants.IMG_SQUARE_SIZE, // Posición X del cuadrado en la imagen
                        0, // Posición Y del cuadrado en la imagen
                        Constants.IMG_SQUARE_SIZE, // An cho del cuadrado en la imagen
                        Constants.IMG_SQUARE_SIZE, // Alto del cuadrado en la imagen
                        j * Constants.SQUARE_SIZE, // Posición X del cuadrado
                        i * Constants.SQUARE_SIZE, // Posición Y del cuadrado
                        Constants.SQUARE_SIZE, // Ancho del cuadrado
                        Constants.SQUARE_SIZE // Alto del cuadrado
                    );
                }
            }
        }

        if (isGameOver) // Si se ha perdido la partida, mostrar el botón de continuar
        {
            // Fondo semitransparente para las letras
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.beginPath();
            ctx.roundRect(
                canvas.width / 2 - Constants.CONTINUE_SIZE / 2,
                canvas.height / 2 - Constants.CONTINUE_SIZE / 2,
                Constants.CONTINUE_SIZE,
                Constants.CONTINUE_SIZE,
                10
            );
            ctx.fill();
            ctx.closePath();
            
            if (isSubmittingScore) // Mostrar indicativo de carga mediante puntos suspensivos
            {
                ctx.fillStyle = "white";
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    ctx.arc(
                        canvas.width / 2 - Constants.CONTINUE_SIZE / 2 + (Constants.CONTINUE_SIZE / 2) * i + Constants.CONTINUE_BACKGROUND_PADDING * (1 - i),
                        canvas.height / 2,
                        3, 0, 2 * Math.PI
                    );
                    ctx.fill();
                }
                ctx.closePath();
            }
            else // Mostrar botón de continuar con un color dependiendo de si se ganó o perdió
            {
                if (isGameWon) ctx.fillStyle = "lime";
                else ctx.fillStyle = "red";

                ctx.beginPath();
                ctx.moveTo(canvas.width / 2 + Constants.CONTINUE_SIZE / 2 - Constants.CONTINUE_BACKGROUND_PADDING, canvas.height / 2);
                ctx.lineTo(canvas.width / 2 - Constants.CONTINUE_SIZE / 2 + Constants.CONTINUE_BACKGROUND_PADDING, canvas.height / 2 + Constants.CONTINUE_SIZE / 2 - Constants.CONTINUE_BACKGROUND_PADDING);
                ctx.lineTo(canvas.width / 2 - Constants.CONTINUE_SIZE / 2 + Constants.CONTINUE_BACKGROUND_PADDING, canvas.height / 2 - Constants.CONTINUE_SIZE / 2 + Constants.CONTINUE_BACKGROUND_PADDING);
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    function generateBoard(initialSquare) {
        // Generación de las minas
        let totalMines = numOfMines;
        let fails = 0;
        let maxFails = boardWidth * boardHeight * (Math.floor(totalMines / 10) + 1);

        // Intentar generar todas las minas, pero evitar también un loop infinito
        while (totalMines > 0 && fails < maxFails) {
            let randomRow = Math.floor(Math.random() * boardHeight);
            let randomCol = Math.floor(Math.random() * boardWidth);

            // Obtener los cuadrados adyacentes del cuadrado inicial
            let tlRow = initialSquare.row; // Superior izquierda
            let tlCol = initialSquare.col;
            let brRow = initialSquare.row; // Inferior derecha
            let brCol = initialSquare.col;
            if (initialSquare.row >= 1) tlRow--;
            if (initialSquare.col >= 1) tlCol--;
            if (initialSquare.row <= boardHeight - 2) brRow++;
            if (initialSquare.col <= boardWidth - 2) brCol++;

            if (board[randomRow][randomCol].content !== Constants.MINE_ID &&
                (randomRow < tlRow || randomRow > brRow || randomCol < tlCol || randomCol > brCol))
            {
                board[randomRow][randomCol].content = Constants.MINE_ID;
                totalMines--;
            }
            else {
                fails++;
                continue;
            }
        }

        if (totalMines > 0) { // Reintentar si no se han podido generar todas las minas
            console.error("No se han podido generar todas las minas, reintentando...");
            generateBoard(initialSquare);
            return;
        }

        // Comprobamos los cuadrados adyacentes para dibujar los números
        for (let i = 0; i < boardHeight; i++) {
            for (let j = 0; j < boardWidth; j++) {
                if (board[i][j].content === Constants.MINE_ID) {
                    let tlRow = i; // Superior izquierda
                    let tlCol = j;
                    let brRow = i; // Inferior derecha
                    let brCol = j;
                    if (i >= 1) tlRow--;
                    if (j >= 1) tlCol--;
                    if (i <= boardHeight - 2) brRow++;
                    if (j <= boardWidth - 2) brCol++;

                    for (let row = tlRow; row <= brRow; row++) {
                        for (let col = tlCol; col <= brCol; col++) {
                            if (row === i && col === j) continue; // No comprobar el cuadrado actual

                            if (board[row][col].content !== Constants.MINE_ID) {
                                board[row][col].content++;
                            }
                        }
                    }
                }
            }
        }
    }

    function revealAdjacentSquares(square) {
        let tlRow = square.row; // Superior izquierda
        let tlCol = square.col;
        let brRow = square.row; // Inferior derecha
        let brCol = square.col;
        if (square.row >= 1) tlRow--;
        if (square.col >= 1) tlCol--;
        if (square.row <= boardHeight - 2) brRow++;
        if (square.col <= boardWidth - 2) brCol++;

        for (let row = tlRow; row <= brRow; row++) {
            for (let col = tlCol; col <= brCol; col++) {
                // console.log("Revealing", row, col);
                if (row === square.row && col === square.col) continue; // No comprobar el cuadrado actual
                if (board[row][col].revealed) continue; // Si ya está revelado, seguir con el siguiente
                if (board[row][col].flagged) continue; // Si está con bandera, no revelar

                board[row][col].revealed = true;

                isGameWon = board.every(row => row.every(square => square.revealed || square.content === Constants.MINE_ID));
                if (board[row][col].content === Constants.MINE_ID || isGameWon) {
                    // Si se revela una mina o ya se han revelado todos los cuadrados que no son minas, terminar la partida
                    onGameOver();
                    return;
                }
                else if (board[row][col].content === 0) revealAdjacentSquares(board[row][col]); // Si es otro 0, revelar también sus adyacentes
            }
        }
    }

    function initEvents() {
        stopEvents(); // Detener eventos anteriores
        console.log("Initializing events...");
        canvas.addEventListener("click", onClickListener);
        canvas.addEventListener("contextmenu", onRightClickListener, false);
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);

        selDifficulty.addEventListener("change", function() {
            document.activeElement.blur();
            if (boardGenerated) return; // Es imposible cambiar la dificultad si se está jugando
            const selectedDifficulty = selDifficulty.options[selDifficulty.selectedIndex].value;
            onDifficultySelected(selectedDifficulty);
            localStorage.setItem(Constants.STORAGE_KEYS.OPTION_DIFFICULTY, selectedDifficulty);
        });

        cbExperimental.addEventListener("click", function() {
            document.activeElement.blur();
            if (boardGenerated) return; // No se puede cambiar la opción si se está jugando
            localStorage.setItem(Constants.STORAGE_KEYS.OPTION_EXPERIMENTAL, cbExperimental.checked);
        });

        inputName.addEventListener("input", function() {
            inputName.value = inputName.value.replace(/\W/g, ""); // \W = [^a-zA-Z0-9_]
            if (boardGenerated) return; // No se puede cambiar el nombre si se está jugando
            localStorage.setItem(Constants.STORAGE_KEYS.OPTION_NAME, inputName.value);
        });
    }

    function stopEvents() {
        console.log("Stopping events...");
        canvas.removeEventListener("click", onClickListener);
        canvas.removeEventListener("contextmenu", onRightClickListener, false);
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mouseup", onMouseUp);
    }

    function restoreLocalStorage() {
        if (localStorage.getItem(Constants.STORAGE_KEYS.OPTION_EXPERIMENTAL) !== null) {
            cbExperimental.checked = localStorage.getItem(Constants.STORAGE_KEYS.OPTION_EXPERIMENTAL) === "true";
        }
        if (localStorage.getItem(Constants.STORAGE_KEYS.OPTION_DIFFICULTY) !== null) {
            selDifficulty.value = localStorage.getItem(Constants.STORAGE_KEYS.OPTION_DIFFICULTY);
            onDifficultySelected(selDifficulty.value);
        }
        if (localStorage.getItem(Constants.STORAGE_KEYS.OPTION_KONAMICODE) !== null) {
            const konamiCode = localStorage.getItem(Constants.STORAGE_KEYS.OPTION_KONAMICODE) === "true";
            if (konamiCode) document.querySelector(".hide").classList.remove("hide");
        }
        if (localStorage.getItem(Constants.STORAGE_KEYS.OPTION_NAME) !== null) {
            inputName.value = localStorage.getItem(Constants.STORAGE_KEYS.OPTION_NAME);
        }
    }

    function onDifficultySelected(difficulty) {
        if (parseInt(difficulty) === Constants.DIFFICULTY_LABELS.CUSTOM) {
            boardWidth = 30;
            boardHeight = 24;
            numOfMines = (boardWidth - 1) * (boardHeight - 1); // Mínimo 10
        }
        else {
            boardWidth = Constants.DIFFICULTY_DATA[difficulty].cols;
            boardHeight = Constants.DIFFICULTY_DATA[difficulty].rows;
            numOfMines = Constants.DIFFICULTY_DATA[difficulty].mines;
        }

        initializeBoard();
        drawBoard();
    }

    function onClickListener(event) {
        let clickedRow = Math.floor(event.offsetY / Constants.SQUARE_SIZE);
        let clickedCol = Math.floor(event.offsetX / Constants.SQUARE_SIZE);
        if (clickedRow >= boardHeight || clickedRow < 0 || clickedCol >= boardWidth || clickedCol < 0) return; // Comprobar dimensiones
        else if (board[clickedRow][clickedCol].revealed) { // Si ya está revelado, no hacemos nada
            if (isRightPressed) onLeftAndRightClickListener(event); // Si se hace click izquierdo y derecho, revelar adyacentes
            return;
        }
        else if (board[clickedRow][clickedCol].flagged) return; // Si está con bandera, no hacemos nada

        if (!boardGenerated) {
            onGameStart(board[clickedRow][clickedCol]);
        }

        board[clickedRow][clickedCol].revealed = true;
        isGameWon = board.every(row => row.every(square => square.revealed || square.content === Constants.MINE_ID));

        if (board[clickedRow][clickedCol].content === 0) {
            // Si el cuadrado es 0, revelar todos los cuadrados adyacentes
            revealAdjacentSquares(board[clickedRow][clickedCol])
        }
        else if (board[clickedRow][clickedCol].content === Constants.MINE_ID || isGameWon) {
            // Si se hace click en una mina o se han revelado todos los cuadrados que no son minas, se termina la partida
            onGameOver();
        }
        
        console.log(clickedRow, clickedCol);
        drawBoard();
    }

    function onRightClickListener(event) {
        let clickedRow = Math.floor(event.offsetY / Constants.SQUARE_SIZE);
        let clickedCol = Math.floor(event.offsetX / Constants.SQUARE_SIZE);
        if (clickedRow >= boardHeight || clickedRow < 0 || clickedCol >= boardWidth || clickedCol < 0) return;
        event.preventDefault(); // Evitar que aparezca el menú contextual
        if (board[clickedRow][clickedCol].revealed) { // Si está revelado, no se puede poner bandera
            if (isLeftPressed) onLeftAndRightClickListener(event); // Si se hace click izquierdo y derecho, revelar adyacentes
            return;
        }

        // Se cambia el estado de la bandera
        board[clickedRow][clickedCol].flagged = !board[clickedRow][clickedCol].flagged;

        console.log(clickedRow, clickedCol);
        drawBoard();
        return false;
    }

    function onLeftAndRightClickListener(event) {
        let clickedRow = Math.floor(event.offsetY / Constants.SQUARE_SIZE);
        let clickedCol = Math.floor(event.offsetX / Constants.SQUARE_SIZE);
        if (clickedRow >= boardHeight || clickedRow < 0 || clickedCol >= boardWidth || clickedCol < 0) return; // Comprobar dimensiones
        revealAdjacentSquares(board[clickedRow][clickedCol]);

        drawBoard();
    }

    function onMouseDown(event) {
        if (event.button === 0) isLeftPressed = true;
        else if (event.button === 2) isRightPressed = true;
    }

    function onMouseUp(event) {
        if (event.button === 0) isLeftPressed = false;
        else if (event.button === 2) isRightPressed = false;
    }

    // El square es donde se ha hecho el primer click
    function onGameStart(square) {
        console.log("Game start");
        generateBoard(square); // Si es el primer click, generamos el tablero (nunca se debe generar una mina en el primer click, por eso se crea a partir de este click)
        chronoObj.start(setInterval(everySecond, 1000)); // Actualizar el cronómetro cada segundo (1000ms));
        boardGenerated = true;
        nameSelected = inputName.value;
        enableOptions(false);
    }

    async function onGameOver() {
        console.log("Game over");
        stopEvents();
        chronoObj.stop();
        isGameOver = true;

        // Al terminar, el tiempo se mostrará en milisegundos
        const msTime = chronoObj.getElapsedTime();
        const miliseconds = chronoObj.zeroPad(Math.floor(msTime) % 1000, 3);
        const seconds = chronoObj.zeroPad(Math.floor(msTime / 1000) % 60, 2);
        const minutes = chronoObj.zeroPad(Math.floor(msTime / 1000 / 60), 2);
        chronoText.textContent = `${minutes}:${seconds}.${miliseconds}`;

        if (isGameWon) {
            console.log("Game won");
            isSubmittingScore = true;
            try { await submitScore(msTime); } // Subir la puntuación al servidor
            catch (error) { console.log(error); }
            drawBoard(); // Cuando se termine de procesar la puntuación, se vuelve a dibujar 
        }
        else console.log("Game lost");
        
        canvas.addEventListener("click", onContinueClickListener); // Habilitar un listener de click para el botón central (en el caso de ganar, esperar a subir la puntuación al servidor)
    }

    function submitScore(msTime) {
        console.log(msTime, nameSelected);
        if (nameSelected === "") {
            isSubmittingScore = false;
            return new Promise((resolve, reject) => reject("No se ha introducido un nombre"));
        }
        else {
            // Al recibir la respuesta, mostrar el botón de continuar en vez de cargando
            console.log("Enviando puntuación al servidor...")
            return fetch("https://gayofo.com/api/minesweeper/scoreboard/" + nameSelected, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "time": msTime })
            }).then(() => {
                console.log("Puntuación enviada correctamente");
                isSubmittingScore = false;
            }).catch(error => {
                console.log("No se pudo conectar con el servidor:", error);
                isSubmittingScore = false;
            })
        }
    }

    function onContinueClickListener(event) {
        console.log("Continuing...");
        if (event.offsetX >= canvas.width / 2 - Constants.CONTINUE_SIZE / 2 && event.offsetX <= canvas.width / 2 + Constants.CONTINUE_SIZE / 2 && event.offsetY >= canvas.height / 2 - Constants.CONTINUE_SIZE / 2 && event.offsetY <= canvas.height / 2 + Constants.CONTINUE_SIZE / 2) {
            initializeBoard();
            enableOptions(true);
            canvas.removeEventListener("click", onContinueClickListener);
            chronoText.textContent = "00:00";
            isGameOver = false;
            isGameWon = false;
            drawBoard();
        }
    }

    function enableOptions(enable) {
        selDifficulty.disabled = !enable;
        cbExperimental.disabled = !enable;
        inputName.disabled = !enable;
    }

    function everySecond() {
        const msTime = chronoObj.getElapsedTime();
        const seconds = chronoObj.zeroPad(Math.floor(msTime / 1000) % 60, 2);
        const minutes = chronoObj.zeroPad(Math.floor(msTime / 1000 / 60), 2);
        chronoText.textContent = `${minutes}:${seconds}`;
    }

    // Inicializar el juego
    restoreLocalStorage(); // Al restaurar el local storage, ya se hace la inicialización y dibujado del tablero, además de la carga de eventos
});

/** TODO: list
 * - El easter egg es esquizofrénico
 * - En el backend implementar la fecha allí, ya no se hará desde el cliente
 * - El input de nombre también se comprobará el regex en el backend
 * - Un padding de 1px entre los cuadrados
 * - Conseguir la tabla de puntuaciones
 * - Cuando se termine la partida, al reiniciar el tablero, se reincia también la tabla de puntuaciones online
 * - Implementar modo personalizado
 */