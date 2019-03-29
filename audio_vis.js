// from https://noisehack.com/build-music-visualizer-web-audio-api/

function initQuad(gl) {
  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
}

function renderQuad(gl) {
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function createShader(gl, vertexShaderSrc, fragmentShaderSrc) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vertexShader, vertexShaderSrc)
  gl.compileShader(vertexShader)
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vertexShader))
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fragmentShader, fragmentShaderSrc)
  gl.compileShader(fragmentShader)
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fragmentShader))
  }

  const shader = gl.createProgram()
  gl.attachShader(shader, vertexShader)
  gl.attachShader(shader, fragmentShader)
  gl.linkProgram(shader)
  gl.useProgram(shader)

  return shader
}

function createTexture(gl) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

function copyAudioDataToTexture(gl, audioData, textureArray) {
  for (let i = 0; i < audioData.length; i++) {
    textureArray[4 * i + 0] = audioData[i]; // R
    textureArray[4 * i + 1] = audioData[i]; // G
    textureArray[4 * i + 2] = audioData[i]; // B
    textureArray[4 * i + 3] = 255; // A
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, audioData.length, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureArray);
}

function main() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  const song = new Audio('//zacharydenton.github.io/noisehack/static/zero_centre.mp3');
  song.crossOrigin = 'anonymous'
  const songSource = audioContext.createMediaElementSource(song);
  songSource.connect(masterGain);
  
  const analyser = audioContext.createAnalyser();
  analyser.connect(audioContext.destination);
  songSource.connect(analyser); // Connects the audio context source to the analyser
  analyser.connect(audioContext.destination); // End destination of an audio graph in a given context
    
  const spectrum = new Uint8Array(analyser.frequencyBinCount);
  
  song.play();
  
  const fragCanvas = document.getElementById('fragment');
  fragCanvas.width = fragCanvas.parentNode.offsetWidth;
  fragCanvas.height = fragCanvas.width * 0.75;
  const gl = fragCanvas.getContext('webgl') || fragCanvas.getContext('experimental-webgl');
  const vertexShaderSrc = document.getElementById("2d-vertex-shader").text;
  const fragmentShaderSrc = document.getElementById("2d-fragment-shader").text;
  
  const fragShader = createShader(gl, vertexShaderSrc, fragmentShaderSrc);
  const fragPosition = gl.getAttribLocation(fragShader, 'position');
  gl.enableVertexAttribArray(fragPosition);
  const fragTime = gl.getUniformLocation(fragShader, 'time');
  gl.uniform1f(fragTime, audioContext.currentTime);
  const fragResolution = gl.getUniformLocation(fragShader, 'resolution');
  gl.uniform2f(fragResolution, fragCanvas.width, fragCanvas.height);
  const fragSpectrumArray = new Uint8Array(4 * spectrum.length);
  const fragSpectrum = createTexture(gl);

  initQuad(gl);
  
  
  ;(function renderFragment() {
    requestAnimationFrame(renderFragment);
    gl.uniform1f(fragTime, audioContext.currentTime);
    analyser.getByteFrequencyData(spectrum);
    //console.log(spectrum[0]);
    copyAudioDataToTexture(gl, spectrum, fragSpectrumArray);
    renderQuad(gl);
  })();
}


