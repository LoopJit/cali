import './style.css'
const { setBackground } = await import('./background.ts')
//import {setBackground} from "./background.ts";

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div id="arrow">↓</div>
    <div id="page1" class="sect">

        <div id="odeiohtml">
            <section id="kitty-container"></section>

            <div class="dialogbox" id="dialog1">
                <b>Olaaa <33</b>
            </div>
            <div class="dialogbox" id="dialog2">
                <b>xauu < /3</b>
            </div>
        </div>
    </div>
    <div id="page2" class="sect">

        <b class="dialogbox centerlate">uhhhh...</b>


    </div>
    <div id="page3" class="sect">
        <b id="dialog3" class="dialogbox">Carrega aqui ^</b>
        <img id="flower" class="centerlate" src="flower.png" alt="">

    </div>

`

//@ts-ignore
const cleanup = setBackground(document.querySelector('#kitty-container')!, '/models/Cat.glb');
//cleanup()
