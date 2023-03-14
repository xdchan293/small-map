'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];



class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)}
         on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    //计算配速
    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }


}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapE;
    #mapZoomLevel = 13;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._getLocalStorage();
        inputType.addEventListener('change', this._toggleElevationField);
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click',this._moveToPopup.bind(this))
    }

    //获取当前位置然后显示地图
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this))
        }
    }

    //显示地图
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        //这里要翻墙才能请求成功
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png?', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        L.marker(coords).addTo(this.#map)
            .bindPopup('you now at there')
            .openPopup();

        this.#map.on('click', this._showFForm.bind(this));

        this.#workouts.forEach(ele => {
            this._renderWorkoutMarker(ele);
       })
    }

    //显示侧边表单
    _showFForm(mapEvent) {
        this.#mapE = mapEvent;

        form.classList.remove('hidden');

        inputDistance.focus();
    }

    _hideForm() {
        //clear input
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        form.classList.add('hidden');

        setTimeout(() => {
            form.getElementsByClassName.display = 'grid'
        }, 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    //产生新的坐标 
    _newWorkout(e) {
        e.preventDefault();

        const allIsNumber = (...inputs) => inputs.every(inp => Number.isFinite(inp));

        const allIsPositive = (...inputs) => inputs.every(inp => inp > 0);

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapE.latlng;
        let workout;

        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!allIsNumber(distance, duration, cadence) ||
                !allIsPositive(distance, duration, cadence)) return alert('the input must be positive number');
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!allIsNumber(distance, duration, elevation) ||
                !allIsPositive(distance, duration)) return alert('the input must be positive number');
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        this.#workouts.push(workout);

        this._renderWorkoutMarker(workout);

        this._renderWorkout(workout);

        this._hideForm();


        this._setLocalStorage();


    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                closeOnClick: false,
                autoClose: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '⚡️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '⚡️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `
        if (workout.type === 'running')
            html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `

        if (workout.type === 'cycling')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          </li>
         `
        // todo 将字符串插入到dom
        form.insertAdjacentHTML('afterend', html);



    }

    //点击列表中的某一项，将地图中心移到那里
    _moveToPopup(e) { 
       const workoutEle = e.target.closest('.workout');
    //    console.log(workoutEle);

       if(!workoutEle) return;
       
       const workout = this.#workouts.find( work => work.id === workoutEle.dataset.id );
    //    console.log(workout)

       this.#map.setView(workout.coords, this.#mapZoomLevel,{
        animate:true,
        pan:{
            duration:1
        }
       })
    }

    _setLocalStorage() {
        sessionStorage.setItem('workouts',JSON.stringify(this.#workouts))
    }


    _getLocalStorage() {
       const data = JSON.parse(sessionStorage.getItem('workouts'));

       if(!data) return;

       this.#workouts = data;

       this.#workouts.forEach(ele => {
            this._renderWorkout(ele);
       })
    }

    reset() {
        sessionStorage.removeItem('workouts');
        location.reload();
    }

    

}

const app = new App();  