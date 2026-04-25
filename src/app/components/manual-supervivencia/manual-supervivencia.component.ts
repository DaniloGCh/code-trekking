import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ManualService } from 'src/app/core/services/manual.service';
import { ManualPaso } from 'src/app/core/models/evento.model';

interface Paso {
  titulo: string;
  descripcion: string;
  icono: string;
}

@Component({
  selector: 'app-manual-supervivencia',
  templateUrl: './manual-supervivencia.component.html',
  styleUrls: ['./manual-supervivencia.component.scss'],
  standalone: false,
})
export class ManualSupervivenciaComponent implements OnInit {

  pasos: ManualPaso[] = [];
  pasoActual: number = 0;
  cargando = true;

  constructor(
    private modalCtrl: ModalController,
    private manualService: ManualService
  ) {}

  ngOnInit() {
    this.manualService.getPasos().subscribe(data => {
      this.pasos = data;
      this.cargando = false;
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  siguiente() {
    if (this.pasoActual < this.pasos.length - 1) {
      this.pasoActual++;
    }
  }

  anterior() {
    if (this.pasoActual > 0) {
      this.pasoActual--;
    }
  }
}