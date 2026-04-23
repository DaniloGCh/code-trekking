import { Component } from '@angular/core';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {

  constructor(
    private weatherGlobal: WeatherGlobalService, 
    private timeService: TimeService) {}

  ngOnInit() {
    this.weatherGlobal.loadWeather();
    this.timeService.startClock();
  }
}
