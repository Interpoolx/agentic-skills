import pc from 'picocolors';

export function showBanner() {
    console.log('');
    console.log(pc.cyan(pc.bold('  █████╗  ██████╗ ███████╗███╗   ██╗████████╗██╗ ██████╗       ███████╗██╗  ██╗██╗██╗     ██╗     ███████╗ ')));
    console.log(pc.cyan(pc.bold(' ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██║██╔════╝       ██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝ ')));
    console.log(pc.cyan(pc.bold(' ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ██║██║            ███████╗█████╔╝ ██║██║     ██║     ███████╗ ')));
    console.log(pc.blue(pc.bold(' ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██║██║            ╚════██║██╔═██╗ ██║██║     ██║     ╚════██║ ')));
    console.log(pc.blue(pc.bold(' ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ██║╚██████╗███████╗███████║██║  ██╗██║███████╗███████╗███████║ ')));
    console.log(pc.blue(pc.bold(' ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝ ')));
    console.log('');
    console.log(pc.dim('             ' + pc.cyan('Universal AI Agent Skills Management') + ' (2.4.9)             '));
    console.log('');
}

export function showSleekBanner() {
    // Alternative more modern style
    console.log(pc.cyan(pc.bold(' A G E N T I C   S K I L L S ')));
    console.log(pc.dim(' ─────────────────────────── '));
}
