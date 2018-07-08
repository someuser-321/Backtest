"use strict";

const loadParticles = () =>
{
	const particlesConfig = {
	  "particles": {
		"number": {
		  "value": 80,
		  "density": {
			"enable": true,
			"value_area": 800
		  }
		},
		"color": {
		  "value": "#fff"
		},
		"shape": {
		  "type": "circle",
		  "stroke": {
			"width": 0,
			"color": "#fff"
		  },
		  "polygon": {
			"nb_sides": 5
		  }
		},
		"opacity": {
		  "value": 0.3,
		  "random": false,
		  "anim": {
			"enable": false,
			"speed": 0.5,
			"opacity_min": 0.1,
			"sync": false
		  }
		},
		"size": {
		  "value": 3,
		  "random": true,
		  "anim": {
			"enable": false,
			"speed": 40,
			"size_min": 0.1,
			"sync": false
		  }
		},
		"line_linked": {
		  "enable": true,
		  "distance": 150,
		  "color": "#ffffff",
		  "opacity": 0.1,
		  "width": 1
		},
		"move": {
		  "enable": true,
		  "speed": 0.2,
		  "direction": "none",
		  "random": false,
		  "straight": false,
		  "out_mode": "out",
		  "bounce": false,
		  "attract": {
			"enable": false,
		  }
		}
	  },
	  "interactivity": {
		"events": {
		  "onhover": {
			"enable": false
		  },
		  "onclick": {
			"enable": false
		  },
		  "resize": true
		}
	  },
	  "retina_detect": true
	};
	
	const jsonUri = "data:text/plain;base64," + window.btoa(JSON.stringify(particlesConfig));
	particlesJS.load("divParticles", jsonUri);
};