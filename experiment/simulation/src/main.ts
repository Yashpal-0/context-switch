let start_simulation = 0;
let prog_A_ip = 0;
let prog_B_ip = 0;
let hardwarePointer = 1;
let k_trap_execute = 0;
let kernelPointer = 0;
let process = "A";
let next_process = "B";
let timer_interrupt_arrived = false;
let timer_interrupt_running = true;
let read_interrupt_arrived = false;
let read_interrupt_running = true;
let exit_interrupt_arrived = false;
let exit_interrupt_running = true;
let exit2_interrupt_arrived = false;
let exit2_interrupt_running = true;
let type_of_interrupt = "interrupt";

/* *************
    Declaring the process instructions and registers as dictionaries
****************/


// Dictionary of instructions for process A
const Program_A_instructions: { name: string; value: string }[] = [
    { name: "0", value: "pushq %rbp" },
    { name: "1", value: "movq %rsp, %rbp" },
    { name: "2", value: "movl $5, -12(%rbp)" },
    { name: "3", value: "movl $10, -8(%rbp)" },
    { name: "4", value: "movl -12(%rbp), %edx" },
    { name: "5", value: "movl -8(%rbp), %eax" },
    { name: "6", value: "addl %edx, %eax" },
    { name: "7", value: "movl %eax, -4(%rbp)" },
    { name: "8", value: "movl -4(%rbp), %eax" },
    { name: "9", value: "popq %rbp" },
    { name: "10", value: "ret" },
];

// Dictionary of registers for process A
const process_A_regSet: { name: string; value: string }[] = [
    { name: "0", value: "%rbp" },
    { name: "1", value: "%rsp, %rbp" },
    { name: "2", value: "%rsp, %rbp" },
    { name: "3", value: "%rsp, %rbp, %edx" },
    { name: "4", value: "%rsp, %rbp, %edx, %eax" },
    { name: "5", value: "%rsp, %rbp, %edx, %eax" },
    { name: "6", value: "%rsp, %rbp, %edx, %eax" },
    { name: "7", value: "%rsp, %rbp, %edx, %eax" },
    { name: "8", value: "%rsp, %rbp, %edx, %eax" },
    { name: "9", value: "%rsp, %rbp, %edx, %eax" },
    { name: "10", value: "-" },
    { name: "11", value: "-" },
];

// Dictionary of instructions for process B
const Program_B_instructions: { name: string; value: string }[] = [
    { name: "0", value: "pushq %rbp" },
    { name: "1", value: "movq %rsp, %rbp" },
    { name: "2", value: "subq $32, %rsp" },
    { name: "3", value: "movq %fs:40, %rax" },
    { name: "4", value: "movq %rax, -8(%rbp)" },
    { name: "5", value: "xorl %eax, %eax" },
    { name: "6", value: "movl $15, -16(%rbp)" },
    { name: "7", value: "leaq -20(%rbp), %rax" },
    { name: "8", value: "movq %rax, %rsi" },
    { name: "9", value: "movl $0, %eax" },
    { name: "10", value: "call __isoc99_scanf@PLT" },
    { name: "11", value: "movl -20(%rbp), %edx" },
    { name: "12", value: "movl -16(%rbp), %eax" },
    { name: "13", value: "addl %edx, %eax" },
    { name: "14", value: "movl %eax, -12(%rbp)" },
    { name: "15", value: "movl 12(%rbp), %eax" },
    { name: "16", value: "movq -8(%rbp), %rcx" },
    { name: "17", value: "xorq %fs:40, %rcx" },
    { name: "18", value: "ret" },
];

// Dictionary of registers for process B
const process_B_regSet: { name: string; value: string }[] = [
    { name: "0", value: "%rbp" },
    { name: "1", value: "%rsp, %rbp" },
    { name: "2", value: "%rsp, %rbp" },
    { name: "3", value: "%rsp, %rbp, %rax" },
    { name: "4", value: "%rsp, %rbp, %rax" },
    { name: "5", value: "%rsp, %rbp, %rax, %eax" },
    { name: "6", value: "%rsp, %rbp, %rax, %eax" },
    { name: "7", value: "%rsp, %rbp, %rax, %eax" },
    { name: "8", value: "%rsp, %rbp, %rax, %eax, %rsi" },
    { name: "9", value: "%rsp, %rbp, %rax, %eax, %rsi" },
    { name: "10", value: "%rsp, %rbp, %rax, %eax, %rsi" },
    { name: "11", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx" },
    { name: "12", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx" },
    { name: "13", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx" },
    { name: "14", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx" },
    { name: "15", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx" },
    { name: "16", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx" },
    { name: "17", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx, %rcx" },
    { name: "18", value: "%rsp, %rbp, %rax, %eax, %rsi, %edx, %rcx" },
    { name: "19", value: "-" },
];

// Dictionary of instructions for context Switch
function context_switch_instructions(process: string, next_process: string): (() => string)[] {
    return [
        () => `save registers of process ${process} to PCB of process ${process}`,
        () => `load registers of process ${next_process} from PCB of process ${next_process}`,
        () => `switch to k-stack of process ${next_process}`,
        () => `return from trap into process ${next_process}`,
    ];
}

// Hardware instructions for user mode to kernel mode
function Hardware_userToKernelMode(process: string): (() => string)[] {
    return [
        () => `save registers of process ${process} to k-stack of process ${process}`,
        () => `Move to kernel mode`,
        () => `move to trap handler`,
    ];
}

// Hardware instructions for kernel mode to user mode
function Hardware_kernelToUserMode(process: string): (() => string)[] {
    return [
        () => `restore registers of process ${process} from k-stack of process ${process}`,
        () => `Move to user mode`,
        () => `jump to process ${process}'s PC`,
    ];
}

function get_cpu_regs(): string {
    if (process == "A") {
        return process_A_regSet[prog_A_ip].value;
    } else {
        return process_B_regSet[prog_B_ip].value;
    }
}

function load_process_A() {
    const process_A: HTMLElement | null = document.getElementById("process");
    if (!process_A) return;

    process_A.innerHTML = "";

    const tbody: HTMLTableSectionElement = document.createElement("tbody");

    for (let i: number = 0; i < Program_A_instructions.length; i++) {
        const tr: HTMLTableRowElement = document.createElement("tr");
        const td1: HTMLTableDataCellElement = document.createElement("td");
        const td2: HTMLTableDataCellElement = document.createElement("td");

        td1.innerHTML = Program_A_instructions[i].name;
        td2.innerHTML = Program_A_instructions[i].value;

        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }

    process_A.appendChild(tbody);
    const umode: HTMLElement | null = document.getElementById("umode");
    if (umode) {
        umode.innerHTML = "USER MODE Process " + process;
    }
}

function load_process_B() {
    const process_B: HTMLElement | null = document.getElementById("process");
    if (!process_B) return;

    process_B.innerHTML = "";

    const tbody: HTMLTableSectionElement = document.createElement("tbody");

    for (let i: number = 0; i < Program_B_instructions.length; i++) {
        const tr: HTMLTableRowElement = document.createElement("tr");
        const td1: HTMLTableDataCellElement = document.createElement("td");
        const td2: HTMLTableDataCellElement = document.createElement("td");

        td1.innerHTML = Program_B_instructions[i].name;
        td2.innerHTML = Program_B_instructions[i].value;

        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }

    process_B.appendChild(tbody);
    const umode: HTMLElement | null = document.getElementById("umode");
    if (umode) {
        umode.innerHTML = "USER MODE Process " + process; // Assuming 'currentProcess' is the TypeScript version of 'process'
    }
}

function setUp_Hardware() {
    const hardware: HTMLElement | null = document.getElementById("interrupt");
    if (!hardware) return;

    const tbody: HTMLTableSectionElement = document.createElement("tbody");

    const hardwareInstructions_u_to_k: (() => string)[] = Hardware_userToKernelMode(process); // Assuming 'currentProcess' is the TypeScript version of 'process'

    for (let i: number = 0; i < hardwareInstructions_u_to_k.length; i++) {
        const tr: HTMLTableRowElement = document.createElement("tr");
        const td1: HTMLTableDataCellElement = document.createElement("td");

        td1.innerHTML = hardwareInstructions_u_to_k[i]();

        tr.appendChild(td1);
        tbody.appendChild(tr);
    }

    hardware.appendChild(tbody);
    const hardwareText: HTMLElement | null = document.getElementById("hardware");
    if (hardwareText) {
        hardwareText.innerHTML = "HARDWARE: " + type_of_interrupt;
    }

    const startButton: HTMLButtonElement | null = document.getElementById("start_hardware_button") as HTMLButtonElement;
    if (startButton) {
        startButton.disabled = false;
    }
}

function start_hardware() {
    const hardware: HTMLTableElement | null = document.getElementById("interrupt") as HTMLTableElement;
    if (!hardware) return;

    hardware.rows[0].style.backgroundColor = "yellow";

    // Remove the start button and add next and previous buttons
    const hardware_button: HTMLElement | null = document.getElementById("hardware_buttons");
    if (!hardware_button) return;

    hardware_button.innerHTML = "";

    const prev_button: HTMLButtonElement = document.createElement("button");
    prev_button.innerHTML = "Previous";
    prev_button.setAttribute("id", "prev_hardware_instruction");
    prev_button.setAttribute("onclick", "hardware_previous()");
    prev_button.disabled = false;
    hardware_button.appendChild(prev_button);

    const next_button: HTMLButtonElement = document.createElement("button");
    next_button.innerHTML = "Next";
    next_button.setAttribute("id", "next_hardware_instruction");
    next_button.setAttribute("onclick", "hardware_next()");
    next_button.disabled = false;
    hardware_button.appendChild(next_button);

    load_memory_Table();

    hardwarePointer = 1;
}

function start() {
    if (start_simulation !== 0) {
        return;
    }

    // Load the process A instructions into the user mode
    const process_A: HTMLTableElement | null = document.getElementById("process") as HTMLTableElement;
    if (!process_A) return;

    load_process_A();
    process_A.rows[0].style.backgroundColor = "yellow";

    // Set up the CPU
    const cpu: HTMLElement | null = document.getElementById("cpu_section");
    if (!cpu) return;

    const tbody_cpu: HTMLTableSectionElement = document.createElement("tbody");
    const row1: HTMLTableRowElement = tbody_cpu.insertRow(0);
    row1.insertCell(0).innerHTML = "PC: ";
    row1.insertCell(1).innerHTML = "1";

    const row2: HTMLTableRowElement = tbody_cpu.insertRow(1);
    row2.insertCell(0).innerHTML = "Mode: ";
    row2.insertCell(1).innerHTML = "User";

    const row3: HTMLTableRowElement = tbody_cpu.insertRow(2);
    row3.insertCell(0).innerHTML = "Registers: ";
    row3.insertCell(1).innerHTML = get_cpu_regs();

    cpu.appendChild(tbody_cpu);

    start_simulation = 1;
}

function process_next() {
    if (process == "A") {
        process_A_next();
    } else {
        process_B_next();
    }
}

function process_previous() {
    if (process == "A") {
        process_A_previous();
    } else {
        process_B_previous();
    }
}

function process_A_next() {
    const process_A: HTMLTableElement | null = document.getElementById("process") as HTMLTableElement;
    const cpu: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;

    if (prog_A_ip == 5 && timer_interrupt_arrived == false) {
        (document.getElementById("next_process") as HTMLButtonElement).disabled = true;
        (document.getElementById("prev_process") as HTMLButtonElement).disabled = true;

        window.alert("Timer interrupt has arrived");

        type_of_interrupt = "timer";
        setUp_Hardware();
        timer_interrupt_arrived = true;

        return;
    }

    if (prog_A_ip == 10 && exit_interrupt_arrived == false) {
        (document.getElementById("next_process") as HTMLButtonElement).disabled = true;
        (document.getElementById("prev_process") as HTMLButtonElement).disabled = true;

        window.alert("The process has to perform an implicit exit to finish its execution.");

        type_of_interrupt = "exit";
        setUp_Hardware();
        exit_interrupt_arrived = true;

        return;
    }

    prog_A_ip += 1;

    if (process_A) {
        process_A.rows[prog_A_ip].style.backgroundColor = "yellow";
        process_A.rows[prog_A_ip].style.fontWeight = "bold";
        process_A.rows[prog_A_ip - 1].style.backgroundColor = "white";
        process_A.rows[prog_A_ip - 1].style.fontWeight = "normal";
    }

    if (prog_A_ip == Program_A_instructions.length + 1) {
        prog_A_ip = prog_A_ip - 1;
        (document.getElementById("next_process") as HTMLButtonElement).disabled = true;
    }

    if (prog_A_ip == 1) {
        (document.getElementById("prev_process") as HTMLButtonElement).disabled = false;
    }

    // Update CPU's PC
    if (cpu) {
        cpu.rows[0].cells[1].innerHTML = (prog_A_ip + 1).toString();
        // put the registers in the register set in the CPU according to the instruction
        cpu.rows[2].cells[1].innerHTML = get_cpu_regs();
    }
}

function process_B_next() {
    const process_B: HTMLTableElement | null = document.getElementById("process") as HTMLTableElement;
    const cpu: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;

    if (prog_B_ip == 10 && read_interrupt_arrived == false) {
        (document.getElementById("next_process") as HTMLButtonElement).disabled = true;
        (document.getElementById("prev_process") as HTMLButtonElement).disabled = true;

        window.alert("You have encountered a read syscall. Hardware will take over the control");

        type_of_interrupt = "read";
        setUp_Hardware();
        read_interrupt_arrived = true;

        return;
    }

    if (prog_B_ip == 18 && exit2_interrupt_arrived == false) {
        (document.getElementById("next_process") as HTMLButtonElement).disabled = true;
        (document.getElementById("prev_process") as HTMLButtonElement).disabled = true;

        window.alert("The program had encountered an implicit exit. Hardware will take over the control");

        type_of_interrupt = "exit";
        setUp_Hardware();
        exit2_interrupt_arrived = true;

        return;
    }

    prog_B_ip += 1;

    // move to the next instruction in the process B table
    if (process_B) {
        process_B.rows[prog_B_ip].style.backgroundColor = "yellow";
        process_B.rows[prog_B_ip].style.fontWeight = "bold";
        process_B.rows[prog_B_ip - 1].style.backgroundColor = "white";
        process_B.rows[prog_B_ip - 1].style.fontWeight = "normal";
    }

    if (prog_B_ip == Program_B_instructions.length) {
        prog_B_ip = prog_B_ip - 1;
        (document.getElementById("next_process") as HTMLButtonElement).disabled = true;
    }
    if (prog_B_ip == 1) {
        (document.getElementById("prev_process") as HTMLButtonElement).disabled = false;
    }

    // Update CPU's PC
    if (cpu) {
        cpu.rows[0].cells[1].innerHTML = (prog_B_ip + 1).toString();
        // put the registers in the register set in the CPU according to the instruction
        cpu.rows[2].cells[1].innerHTML = get_cpu_regs();
    }
}

function process_A_previous() {
    prog_A_ip -= 1;
    // Update CPU's PC
    const cpu: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;
    if (cpu) {
        cpu.rows[0].cells[1].innerHTML = (prog_A_ip + 1).toString();
        // put the registers in the register set in the CPU according to the instruction
        cpu.rows[2].cells[1].innerHTML = process_A_regSet[prog_A_ip].value;
    }

    // if the previous instruction is the first instruction, then disable the previous button
    const prev_button: HTMLButtonElement | null = document.getElementById("prev_process") as HTMLButtonElement;
    if (prog_A_ip === 0 && prev_button) {
        prev_button.disabled = true;
    }

    // if the next button is disabled, enable it
    const next_button: HTMLButtonElement | null = document.getElementById("next_process") as HTMLButtonElement;
    if (prog_A_ip === Program_A_instructions.length - 2 && next_button) {
        next_button.disabled = false;
    }

    // update the highlighted instruction
    const process_A: HTMLTableElement | null = document.getElementById("process") as HTMLTableElement;
    if (process_A) {
        process_A.rows[prog_A_ip].style.backgroundColor = "yellow";
        process_A.rows[prog_A_ip].style.fontWeight = "bold";
        process_A.rows[prog_A_ip + 1].style.backgroundColor = "white";
        process_A.rows[prog_A_ip + 1].style.fontWeight = "normal";
    }
}

function process_B_previous() {
    prog_B_ip -= 1;
    // Update CPU's PC
    const cpu: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;
    if (cpu) {
        cpu.rows[0].cells[1].innerHTML = (prog_B_ip + 1).toString();
        // put the registers in the register set in the CPU according to the instruction
        cpu.rows[2].cells[1].innerHTML = process_B_regSet[prog_B_ip].value;
    }

    // if the previous instruction is the first instruction, then disable the previous button
    const prev_button: HTMLButtonElement | null = document.getElementById("prev_process") as HTMLButtonElement;
    if (prog_B_ip === 0 && prev_button) {
        prev_button.disabled = true;
    }

    // if the next button is disabled, enable it
    const next_button: HTMLButtonElement | null = document.getElementById("next_process") as HTMLButtonElement;
    if (prog_B_ip === Program_B_instructions.length - 2 && next_button) {
        next_button.disabled = false;
    }

    // update the highlighted instruction
    const process_B: HTMLTableElement | null = document.getElementById("process") as HTMLTableElement;
    if (process_B) {
        process_B.rows[prog_B_ip].style.backgroundColor = "yellow";
        process_B.rows[prog_B_ip].style.fontWeight = "bold";
        process_B.rows[prog_B_ip + 1].style.backgroundColor = "white";
        process_B.rows[prog_B_ip + 1].style.fontWeight = "normal";
    }
}


function load_memory_Table() {
    const memoryTable: HTMLTableElement | null = document.getElementById("memTable") as HTMLTableElement;
    if (!memoryTable) return;

    memoryTable.innerHTML = "";

    const tbody = document.createElement("tbody");

    tbody.insertRow(-1).insertCell(0).innerHTML = "k-stack of process A";
    tbody.insertRow(-1).insertCell(0).innerHTML = "k-stack of process B";

    // Append the tbody to the table
    memoryTable.appendChild(tbody);
    if (process == "A") {
        memoryTable.rows[0].style.backgroundColor = "gold";
        memoryTable.rows[0].style.fontWeight = "bold";
    } else {
        memoryTable.rows[1].style.backgroundColor = "gold";
        memoryTable.rows[1].style.fontWeight = "bold";
    }
}


function hardware_next() {
    const cpu: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;
    if (!cpu) return;

    if (hardwarePointer == 3) {
        const next_hardware_instruction: HTMLButtonElement | null = document.getElementById("next_hardware_instruction") as HTMLButtonElement;
        if (next_hardware_instruction) {
            next_hardware_instruction.disabled = true;
        }
    }

    const hardware_instructions: HTMLTableElement | null = document.getElementById("interrupt") as HTMLTableElement;
    if (!hardware_instructions) return;

    hardware_instructions.rows[hardwarePointer].style.backgroundColor = "yellow";
    hardware_instructions.rows[hardwarePointer].style.fontWeight = "bold";
    hardware_instructions.rows[hardwarePointer - 1].style.backgroundColor = "white";
    hardware_instructions.rows[hardwarePointer - 1].style.fontWeight = "normal";

    hardwarePointer += 1;

    if (hardwarePointer == 2) {
        // Change the CPU mode to kernel mode
        cpu.rows[1].cells[1].innerHTML = "Kernel Mode";
    }

    if (hardwarePointer == 3) {
        window.alert("Select the correct Trap handler to execute");
        loadTheHandlers();
        const kernelCode_execute: HTMLButtonElement | null = document.getElementById("kernelCode_execute") as HTMLButtonElement;
        if (kernelCode_execute) {
            kernelCode_execute.disabled = false;
        }
    }
}


function hardware_previous() {
    const cpu: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;
    if (!cpu) return;

    const hardware_instructions: HTMLTableElement | null = document.getElementById("interrupt") as HTMLTableElement;
    if (!hardware_instructions || hardwarePointer <= 1) return;

    hardware_instructions.rows[hardwarePointer - 2].style.backgroundColor = "yellow";
    hardware_instructions.rows[hardwarePointer - 2].style.fontWeight = "bold";
    hardware_instructions.rows[hardwarePointer - 1].style.backgroundColor = "white";
    hardware_instructions.rows[hardwarePointer - 1].style.fontWeight = "normal";

    hardwarePointer -= 1;

    if (hardwarePointer === 1) {
        // Change the CPU mode to kernel mode
        cpu.rows[1].cells[1].innerHTML = "User Mode";
    }

    if (hardwarePointer === 2) {
        const next_hardware_instruction: HTMLButtonElement | null = document.getElementById("next_hardware_instruction") as HTMLButtonElement;
        if (next_hardware_instruction) {
            next_hardware_instruction.disabled = false;
        }
    }
}


function loadTheHandlers() {
    const handlers: HTMLElement | null = document.getElementById("handlers");
    if (!handlers) return;

    handlers.innerHTML = "";

    const timerTrapHandler: HTMLButtonElement = document.createElement("button");
    timerTrapHandler.setAttribute("id", "timerTrap");
    timerTrapHandler.innerHTML = "Timer Trap Handler";
    timerTrapHandler.setAttribute("onclick", "select_timer_handler()");

    const readTrapHandler: HTMLButtonElement = document.createElement("button");
    readTrapHandler.setAttribute("id", "readTrap");
    readTrapHandler.innerHTML = "Read Trap Handler";
    readTrapHandler.setAttribute("onclick", "select_read_handler()");

    const exitTrapHandler: HTMLButtonElement = document.createElement("button");
    exitTrapHandler.setAttribute("id", "exitTrap");
    exitTrapHandler.innerHTML = "Exit Trap Handler";
    exitTrapHandler.setAttribute("onclick", "select_exit_handler()");

    handlers.appendChild(timerTrapHandler);
    handlers.appendChild(readTrapHandler);
    handlers.appendChild(exitTrapHandler);
}

function select_timer_handler() {
    if (timer_interrupt_running == true) {
        load_timer_handler();
    }
}

function select_read_handler() {
    if (read_interrupt_running == true) {
        console.log("read handler");
        load_read_handler();
    }
}

function select_exit_handler() {
    if (exit_interrupt_running == true || exit2_interrupt_running == true) {
        load_exit_handler();
    }
}

function load_exit_handler() {
    const interrupt: HTMLElement | null = document.getElementById("interrupt");
    if (!interrupt) return;
    interrupt.innerHTML = "";

    const hardware_buttons: HTMLElement | null = document.getElementById("hardware_buttons");
    if (!hardware_buttons) return;
    hardware_buttons.innerHTML = "";

    const start_hardware_button: HTMLButtonElement = document.createElement("button");
    start_hardware_button.setAttribute("id", "start_hardware_button");
    start_hardware_button.innerHTML = "Start";
    // start_hardware_button.setAttribute("onclick", "start_hardware_k_to_u()");
    start_hardware_button.disabled = true;

    hardware_buttons.appendChild(start_hardware_button);

    const p_hardware: HTMLElement | null = document.getElementById("hardware");
    if (!p_hardware) return;
    p_hardware.innerHTML = "HARDWARE";

    // Get the reference to the "kernel" table
    const kernelTable: HTMLElement | null = document.getElementById("kernel");
    if (!kernelTable) return;
    kernelTable.innerHTML = "";

    // Create a tbody element
    const tbody: HTMLTableSectionElement = document.createElement("tbody");
    tbody.insertRow(-1).insertCell(0).innerHTML = "void __noreturn do_exit(long code)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "{";
    tbody.insertRow(-1).insertCell(0).innerHTML = "struct task_struct *tsk = current;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "int group_dead;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "WARN_ON(irqs_disabled());";
    tbody.insertRow(-1).insertCell(0).innerHTML = "synchronize_group_exit(tsk, code);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "WARN_ON(tsk->plug);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "kcov_task_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "kmsan_task_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "coredump_task_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "ptrace_event(PTRACE_EVENT_EXIT, code);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "user_events_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "validate_creds_for_do_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "io_uring_files_cancel();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_signals(tsk);  /* sets PF_EXITING */";
    tbody.insertRow(-1).insertCell(0).innerHTML = "/* sync mm's RSS info before statistics gathering */";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->mm)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "sync_mm_rss(tsk->mm);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "account_update_integrals(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "group_dead = atomic_dec_and_test(&tsk->signal->live);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (group_dead) {";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (unlikely(is_global_init(tsk)))";
    tbody.insertRow(-1).insertCell(0).innerHTML = "panic(\"Attempted to kill init! exitcode=0x%08x\\n\",";
    tbody.insertRow(-1).insertCell(0).innerHTML = "tsk->signal->group_exit_code ?: (int)code);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "#ifdef CONFIG_POSIX_TIMERS";
    tbody.insertRow(-1).insertCell(0).innerHTML = "hrtimer_cancel(&tsk->signal->real_timer);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_itimers(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "#endif";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->mm)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "setmax_mm_hiwater_rss(&tsk->signal->maxrss, tsk->mm);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "}";
    tbody.insertRow(-1).insertCell(0).innerHTML = "acct_collect(code, group_dead);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (group_dead)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "tty_audit_exit();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "audit_free(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "tsk->exit_code = code;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "taskstats_exit(tsk, group_dead);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_mm();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (group_dead)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "acct_process();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "trace_sched_process_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_sem(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_shm(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_files(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_fs(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (group_dead)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "disassociate_ctty(1);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_task_namespaces(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_task_work(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_thread(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "perf_event_exit_task(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "sched_autogroup_exit_task(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "cgroup_exit(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_task_rcu_start();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_notify(tsk, group_dead);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "proc_exit_connector(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "mpol_put_task_policy(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "#ifdef CONFIG_FUTEX";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (unlikely(current->pi_state_cache))";
    tbody.insertRow(-1).insertCell(0).innerHTML = "kfree(current->pi_state_cache);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "#endif";
    tbody.insertRow(-1).insertCell(0).innerHTML = "debug_check_no_locks_held();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->io_context)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_io_context(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->splice_pipe)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "free_pipe_info(tsk->splice_pipe);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->vfork_done)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "vfree(tsk->vfork_done);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->vfork_parent)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "vfree(tsk->vfork_parent);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->vfork_exec_parent)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "vfree(tsk->vfork_exec_parent);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (tsk->vfork_child)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "vfree(tsk->vfork_child);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_rcu();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "exit_tasks_rcu_finish();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "lockdep_free_task(tsk);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "do_task_dead();";
    tbody.insertRow(-1).insertCell(0).innerHTML = "}";

    // Append the tbody to the table
    kernelTable.appendChild(tbody);
}

function load_read_handler() {
    console.log("load_read_handler() called");

    const interrupt: HTMLElement | null = document.getElementById("interrupt");
    if (!interrupt) return;
    interrupt.innerHTML = "";

    const hardware_buttons: HTMLElement | null = document.getElementById("hardware_buttons");
    if (!hardware_buttons) return;
    hardware_buttons.innerHTML = "";

    const start_hardware_button: HTMLButtonElement = document.createElement("button");
    start_hardware_button.setAttribute("id", "start_hardware_button");
    start_hardware_button.innerHTML = "Start";
    // start_hardware_button.setAttribute("onclick", "start_hardware_k_to_u()");
    start_hardware_button.disabled = true;

    hardware_buttons.appendChild(start_hardware_button);

    const p_hardware: HTMLElement | null = document.getElementById("hardware");
    if (!p_hardware) return;
    p_hardware.innerHTML = "HARDWARE";

    // Get the reference to the "kernel" table
    const kernelTable: HTMLElement | null = document.getElementById("kernel");
    if (!kernelTable) return;
    kernelTable.innerHTML = "";

    // Create a tbody element
    const tbody: HTMLTableSectionElement = document.createElement("tbody");
    tbody.insertRow(0).insertCell(0).innerHTML = "static ssize_t new_sync_read(struct file *filp, char __user *buf, size_t len, loff_t *ppos)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "{";
    tbody.insertRow(-1).insertCell(0).innerHTML = "struct kiocb kiocb;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "struct iov_iter iter;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "ssize_t ret;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "init_sync_kiocb(&kiocb, filp);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "kiocb.ki_pos = (ppos ? *ppos : 0);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "iov_iter_ubuf(&iter, ITER_DEST, buf, len);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "ret = call_read_iter(filp, &kiocb, &iter);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "BUG_ON(ret == -EIOCBQUEUED);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "if (ppos)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "*ppos = kiocb.ki_pos;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "return ret;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "}";

    // Append the tbody to the kernelTable
    kernelTable.appendChild(tbody);
}

function load_timer_handler() {
    const interrupt: HTMLElement | null = document.getElementById("interrupt");
    if (!interrupt) return;
    interrupt.innerHTML = "";

    const hardware_buttons: HTMLElement | null = document.getElementById("hardware_buttons");
    if (!hardware_buttons) return;
    hardware_buttons.innerHTML = "";

    const start_hardware_button: HTMLButtonElement = document.createElement("button");
    start_hardware_button.setAttribute("id", "start_hardware_button");
    start_hardware_button.innerHTML = "Start";
    // start_hardware_button.setAttribute("onclick", "start_hardware_k_to_u()");
    start_hardware_button.disabled = true;

    hardware_buttons.appendChild(start_hardware_button);

    const p_hardware: HTMLElement | null = document.getElementById("hardware");
    if (!p_hardware) return;
    p_hardware.innerHTML = "HARDWARE";

    // Get the reference to the "kernel" table
    const kernelTable: HTMLElement | null = document.getElementById("kernel");
    if (!kernelTable) return;
    kernelTable.innerHTML = "";

    // Create a tbody element
    const tbody: HTMLTableSectionElement = document.createElement("tbody");

    // Add rows to the tbody
    tbody.insertRow(0).insertCell(0).innerHTML = "static void local_apic_timer_interrupt(void)";
    tbody.insertRow(-1).insertCell(0).innerHTML = "{";
    tbody.insertRow(-1).insertCell(0).innerHTML = "   struct clock_event_device *evt = this_cpu_ptr(&lapic_events);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "   if (!evt->event_handler) {";
    tbody.insertRow(-1).insertCell(0).innerHTML = "       pr_warn(\"Spurious LAPIC timer interrupt on cpu %d\\n\", smp_processor_id());";
    tbody.insertRow(-1).insertCell(0).innerHTML = "       lapic_timer_shutdown(evt);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "       return;";
    tbody.insertRow(-1).insertCell(0).innerHTML = "   }";
    tbody.insertRow(-1).insertCell(0).innerHTML = "   inc_irq_stat(apic_timer_irqs);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "   evt->event_handler(evt);";
    tbody.insertRow(-1).insertCell(0).innerHTML = "}";

    // Append the tbody to the kernelTable
    kernelTable.appendChild(tbody);
}

function execute() {
    k_trap_execute = 1;
    const kernelSection: HTMLElement | null = document.getElementById("kernel");

    if (!kernelSection) return;

    // Remove existing content from the kernel section
    kernelSection.innerHTML = "";

    // Create the spinner container element
    const spinnerContainer: HTMLDivElement = document.createElement("div");
    spinnerContainer.classList.add("spinner-container");

    // Create and append the spinner element
    const spinner: HTMLDivElement = document.createElement("div");
    spinner.classList.add("spinner");
    spinnerContainer.appendChild(spinner);

    // Append the spinner container to the kernel section
    kernelSection.appendChild(spinnerContainer);

    // Simulate an asynchronous operation
    setTimeout(function () {
        // Remove the spinner container and add the executed code
        kernelSection.innerHTML =
            "<tr><td>Executed the trap Handler</td></tr><tr><td>Please do the context switch ... </td></tr>";
        const kernel_button: HTMLElement | null = document.getElementById("kernel_buttons");
        if (!kernel_button) return;
        kernel_button.innerHTML = "";

        const contextSwitchButton: HTMLButtonElement = document.createElement("button");
        contextSwitchButton.setAttribute("id", "contextSwitch");
        contextSwitchButton.innerHTML = "Context Switch";
        contextSwitchButton.setAttribute("onclick", "contextSwitch()");

        kernel_button.appendChild(contextSwitchButton);
    }, 2000); // Change the delay time to suit your needs
}

// Function to get the kernel table element
function getKernelTable(): HTMLTableElement | null {
    return document.getElementById("kernel") as HTMLTableElement | null;
}

// Function to get the process element
function getProcessElement(): HTMLElement | null {
    return document.getElementById("process");
}

// Function to get the kernel buttons element
function getKernelButtonsElement(): HTMLElement | null {
    return document.getElementById("kernel_buttons");
}

function contextSwitch() {
    if (k_trap_execute === 1) {
        const kernelTable = getKernelTable();
        if (!kernelTable) return;

        kernelTable.innerHTML = "";
        // Create a tbody element
        const tbody: HTMLTableSectionElement = document.createElement("tbody");

        if (exit2_interrupt_arrived === true) {
            const tr: HTMLTableRowElement = document.createElement("tr");
            const td: HTMLTableDataCellElement = document.createElement("td");

            td.innerHTML = "Save registers of process B to PCB of process B.";

            tr.appendChild(td);
            tbody.appendChild(tr);

            kernelTable.appendChild(tbody);

            kernelTable.rows[kernelPointer].style.backgroundColor = "yellow";
            console.log("updating the current process's PCB");
            updatePCB();

            const nextKernelInstructionButton: HTMLButtonElement | null = document.getElementById("next_kernel_instruction") as HTMLButtonElement;
            if (nextKernelInstructionButton) nextKernelInstructionButton.disabled = true;
        } else {
            const contextSwtchInstructions = context_switch_instructions(process, next_process);

            for (let i = 0; i < contextSwtchInstructions.length; i++) {
                const tr: HTMLTableRowElement = document.createElement("tr");
                const td: HTMLTableDataCellElement = document.createElement("td");

                td.innerHTML = contextSwtchInstructions[i]();

                tr.appendChild(td);
                tbody.appendChild(tr);
            }
            // Append the tbody to the kernelTable
            kernelTable.appendChild(tbody);
        }

        if (exit2_interrupt_arrived === true) {
            window.alert("Updated process B's PCB. Both process A and process B have completed execution. Please start again to observe context switching again..");
            const processElement = getProcessElement();
            if (processElement) processElement.innerHTML = "";
        }

        kernelTable.rows[kernelPointer].style.backgroundColor = "yellow";
        console.log("updating the current process's PCB");
        updatePCB();

        const current_process = process;
        process = next_process;
        next_process = current_process;

        // Append next button to the kernel_buttons div
        const kernelButtons = getKernelButtonsElement();
        if (!kernelButtons) return;
        kernelButtons.innerHTML = "";

        const nextButton: HTMLButtonElement = document.createElement("button");
        nextButton.id = "next_kernel_instruction";
        nextButton.textContent = "Next";
        nextButton.onclick = executeNextKernelInstruction;
        kernelButtons.appendChild(nextButton);
    }
    k_trap_execute = 0;
}

function updatePCB() {
    console.log(process);
    if (process == "A") {
        console.log("current process to be saved is A");
        updatePCB_A();
    }
    else if (process == "B") {
        updatePCB_B();
    }
}

function restorePCB() {
    if (process == "A") {
        restoreFrom_A();
    }
    else if (process == "B") {
        restoreFrom_B();
    }
}

function updatePCB_B() {
    const pcb_B_table: HTMLTableElement | null = document.getElementById("pcbB") as HTMLTableElement;
    pcb_B_table.rows[1].cells[1].innerHTML = (prog_B_ip + 1).toString();
    pcb_B_table.rows[2].cells[1].innerHTML = "ready";
    if (type_of_interrupt === "exit") {
        pcb_B_table.rows[2].cells[1].innerHTML = "terminated";
    }
    pcb_B_table.rows[3].cells[1].innerHTML = process_B_regSet[prog_B_ip].value;
    prog_B_ip = prog_B_ip + 1;
}

function updatePCB_A() {
    const pcb_A_table: HTMLTableElement | null = document.getElementById("pcbA") as HTMLTableElement;
    pcb_A_table.rows[1].cells[1].innerHTML = (prog_A_ip + 1).toString();
    pcb_A_table.rows[2].cells[1].innerHTML = "ready";
    if (type_of_interrupt === "exit") {
        pcb_A_table.rows[2].cells[1].innerHTML = "terminated";
    }
    pcb_A_table.rows[3].cells[1].innerHTML = process_A_regSet[prog_A_ip].value;
    prog_A_ip = prog_A_ip + 1;
}

function restoreFrom_A() {
    const cpu = document.getElementById("cpu_section") as HTMLTableElement;
    cpu.rows[0].cells[1].innerHTML = prog_A_ip.toString();
    cpu.rows[2].cells[1].innerHTML = process_A_regSet[prog_A_ip].value;

    const pcb_A_table = document.getElementById("pcbA") as HTMLTableElement;
    pcb_A_table.rows[2].cells[1].innerHTML = "running";
}

function restoreFrom_B() {
    const cpu = document.getElementById("cpu_section") as HTMLTableElement;
    cpu.rows[0].cells[1].innerHTML = prog_B_ip.toString();
    if (prog_B_ip === 0) {
        cpu.rows[2].cells[1].innerHTML = "-";
    }
    else {
        cpu.rows[2].cells[1].innerHTML = process_B_regSet[prog_B_ip].value;
    }
    const pcb_B_table = document.getElementById("pcbB") as HTMLTableElement;
    pcb_B_table.rows[2].cells[1].innerHTML = "running";
}


function load_process() {
    if (process == "A") {
        load_process_A();
    }
    else if (process == "B") {
        load_process_B();
    }
}

function executeNextKernelInstruction() {
    // Update the kernel pointer
    kernelPointer += 1;

    if (kernelPointer === 1) {
        restorePCB();
    }
    if (kernelPointer === 2) {
        load_memory_Table();
    }
    if (kernelPointer === 3) {
        load_process();
    }
    const kernelTable = document.getElementById("kernel") as HTMLTableElement | null;

    if (kernelTable) {
        if (kernelPointer === kernelTable.rows.length - 1) {
            window.alert("Hardware will take over the control after this instruction.");
            const kernelButtons = document.getElementById("kernel_buttons");
            if (kernelButtons) {
                kernelButtons.innerHTML = "";

                const execute_button = document.createElement("button");
                execute_button.setAttribute("id", "kernelCode_execute");
                execute_button.innerHTML = "Execute";
                execute_button.setAttribute("onclick", "execute()");
                execute_button.disabled = true;
                kernelButtons.appendChild(execute_button);

                load_Hardware_k_to_u();

                const handlersElement = document.getElementById("handlers");
                if (handlersElement) {
                    handlersElement.innerHTML = "";
                }

                kernelPointer = 0;
            }
        }

        // Highlight the row as we move to the next instruction
        const prevRow = kernelTable.rows[kernelPointer - 1];
        const currentRow = kernelTable.rows[kernelPointer];
        if (prevRow) {
            prevRow.style.backgroundColor = "white";
        }
        if (currentRow) {
            currentRow.style.backgroundColor = "yellow";
        }
    }
}


function load_Hardware_k_to_u() {
    const hardwareTable = document.getElementById("interrupt") as HTMLTableElement | null;
    if (!hardwareTable) return;
    
    hardwareTable.innerHTML = "";
    // Create a tbody element
    const tbody: HTMLTableSectionElement = document.createElement("tbody");

    const hardware_instructions = Hardware_kernelToUserMode(process);

    for (let i = 0; i < hardware_instructions.length; i++) {
        const tr: HTMLTableRowElement = document.createElement("tr");
        const td: HTMLTableDataCellElement = document.createElement("td");

        td.innerHTML = hardware_instructions[i]();

        tr.appendChild(td);
        tbody.appendChild(tr);
    }
    // Append the tbody to the hardwareTable
    hardwareTable.appendChild(tbody);

    const hardwareButtons = document.getElementById("hardware_buttons");
    if (!hardwareButtons) return;
    hardwareButtons.innerHTML = "";

    const prevButton: HTMLButtonElement = document.createElement("button");
    prevButton.id = "prev_hardware_instruction";
    prevButton.textContent = "Previous";
    prevButton.onclick = hardware_previous_k_to_u;
    hardwareButtons.appendChild(prevButton);

    const nextButton: HTMLButtonElement = document.createElement("button");
    nextButton.id = "next_hardware_instruction";
    nextButton.textContent = "Next";
    nextButton.onclick = hardware_next_k_to_u;
    hardwareButtons.appendChild(nextButton);

    hardwarePointer = 0;
    const firstRow = hardwareTable.rows[0];
    if (firstRow) {
        firstRow.style.backgroundColor = "yellow";
        firstRow.style.fontWeight = "bold";
    }

    if (timer_interrupt_arrived === true && timer_interrupt_running === true) {
        timer_interrupt_running = false;
    }

    if (read_interrupt_arrived === true && read_interrupt_running === true) {
        read_interrupt_running = false;
    }

    if (exit_interrupt_arrived === true && exit_interrupt_running === true) {
        exit_interrupt_running = false;
    }

    if (exit2_interrupt_arrived === true && exit2_interrupt_running === true) {
        exit2_interrupt_running = false;
    }
}

function process_ip(): number {
    if (process === "A") {
        return prog_A_ip;
    } else if (process === "B") {
        return prog_B_ip;
    }
    // Return a default value or handle the case when process is neither "A" nor "B"
    return 0; // Or any other appropriate default value
}


function hardware_next_k_to_u() {
    const hardwareTable = document.getElementById("interrupt") as HTMLTableElement | null;
    if (!hardwareTable) return;

    hardwareTable.rows[hardwarePointer].style.backgroundColor = "white";
    hardwareTable.rows[hardwarePointer].style.fontWeight = "normal";
    hardwarePointer += 1;

    if (hardwarePointer == 1) {
        const cpu_section: HTMLTableElement | null = document.getElementById("cpu_section") as HTMLTableElement;
        if (cpu_section) {
            cpu_section.rows[1].cells[1].innerHTML = "User";
        }
    }

    if (hardwarePointer == 2) {
        const nextHardwareInstructionButton = document.getElementById("next_hardware_instruction") as HTMLButtonElement | null;
        if (nextHardwareInstructionButton) nextHardwareInstructionButton.disabled = true;

        window.alert("Hardware has finished executing. CPU will start executing the new process from here.");

        const prevProcessButton = document.getElementById("prev_process") as HTMLButtonElement | null;
        const nextProcessButton = document.getElementById("next_process") as HTMLButtonElement | null;
        if (prevProcessButton) prevProcessButton.disabled = false;
        if (nextProcessButton) nextProcessButton.disabled = false;

        const process_table = document.getElementById("process") as HTMLTableElement | null;

        if (process_ip() == 0) {
            const firstRow = process_table?.rows[process_ip()];
            if (firstRow) {
                firstRow.style.backgroundColor = "yellow";
                firstRow.style.fontWeight = "bold";
            }
        } else {
            const secondRow = process_table?.rows[process_ip() + 1];
            if (secondRow) {
                secondRow.style.backgroundColor = "yellow";
                secondRow.style.fontWeight = "bold";
            }
        }

        const prevHardwareInstructionButton = document.getElementById("prev_hardware_instruction") as HTMLButtonElement | null;
        if (prevHardwareInstructionButton) prevHardwareInstructionButton.disabled = true;

        hardwareTable.innerHTML = "";

        const hardwareButtons = document.getElementById("hardware_buttons");
        if (hardwareButtons) {
            hardwareButtons.innerHTML = "";

            const start_button = document.createElement("button");
            start_button.setAttribute("id", "start_hardware_button");
            start_button.innerHTML = "Start";
            start_button.setAttribute("onclick", "start_hardware()");
            start_button.disabled = true;
            hardwareButtons.appendChild(start_button);
        }
    }

    const currentRow = hardwareTable.rows[hardwarePointer];
    if (currentRow) {
        currentRow.style.backgroundColor = "yellow";
        currentRow.style.fontWeight = "bold";
    }
}

function hardware_previous_k_to_u() {
    const hardwareTable = document.getElementById("interrupt") as HTMLTableElement | null;
    if (!hardwareTable) return;

    hardwareTable.rows[hardwarePointer].style.backgroundColor = "white";
    hardwareTable.rows[hardwarePointer].style.fontWeight = "normal";

    if (hardwarePointer == 1) {
        const prevHardwareInstructionButton = document.getElementById("prev_hardware_instruction") as HTMLButtonElement | null;
        if (prevHardwareInstructionButton) prevHardwareInstructionButton.disabled = true;
    }

    hardwarePointer -= 1;

    const currentRow = hardwareTable.rows[hardwarePointer];
    if (currentRow) {
        currentRow.style.backgroundColor = "yellow";
        currentRow.style.fontWeight = "bold";
    }
}
