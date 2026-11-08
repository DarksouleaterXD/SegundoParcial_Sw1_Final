<script lang="ts">
import { defineComponent } from 'vue';
import { RegisterPage } from './register.page';
import { setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'RegisterPageView',

  setup(props, { emit }) {
    return {
      ...setupView(RegisterPage, props, emit),
    };
  },
});
</script>

<template>
  <app-register-page class="studio-view">
    <section class="auth-page">
      <div class="auth-copy">
        <a href="/" class="back-link">← Explorar Órbita Studio</a>
        <p class="eyebrow">EMPIEZA A MODELAR</p>
        <h1>Tu próximo sistema empieza aquí.</h1>
        <p>
          Organiza tus modelos, invita a colaboradores por correo y transforma tus diagramas en aplicaciones.
          Tus proyectos te esperan al volver.
        </p>
      </div>
      <cf-card class="auth-card studio-card-outlined">
        <cf-card-header>
          <cf-card-title>Crear cuenta</cf-card-title>
          <cf-card-subtitle>Empieza tu espacio de trabajo en Órbita Studio.</cf-card-subtitle>
        </cf-card-header>
        <cf-card-content>
          <form @submit.prevent="submit()" novalidate class="auth-form">
            <cf-form-field class="studio-field">
              <label class="studio-field-control">
                <cf-label>Nombre</cf-label>
                <input
                  aria-required="true"
                  autocomplete="name"
                  v-model="form.controls.displayName.value"
                  @blur="form.controls.displayName.markAsTouched()"
                  :aria-invalid="form.controls.displayName.invalid && form.controls.displayName.touched"
                  placeholder=" "
                />
              </label>
              <div class="studio-field-notes">
                <template v-if="form.controls.displayName.invalid && form.controls.displayName.touched">
                  <cf-error>Introduce tu nombre.</cf-error>
                </template>
              </div>
            </cf-form-field>
            <cf-form-field class="studio-field">
              <label class="studio-field-control">
                <cf-label>Correo</cf-label>
                <input
                  aria-required="true"
                  type="email"
                  autocomplete="email"
                  v-model="form.controls.email.value"
                  @blur="form.controls.email.markAsTouched()"
                  :aria-invalid="form.controls.email.invalid && form.controls.email.touched"
                  placeholder=" "
                />
              </label>
              <div class="studio-field-notes">
                <template v-if="form.controls.email.invalid && form.controls.email.touched">
                  <cf-error>Introduce un correo valido.</cf-error>
                </template>
              </div>
            </cf-form-field>
            <cf-form-field class="studio-field">
              <label class="studio-field-control">
                <cf-label>Contrasena</cf-label>
                <input
                  aria-required="true"
                  type="password"
                  autocomplete="new-password"
                  v-model="form.controls.password.value"
                  @blur="form.controls.password.markAsTouched()"
                  :aria-invalid="form.controls.password.invalid && form.controls.password.touched"
                  placeholder=" "
                />
              </label>
              <div class="studio-field-notes">
                <template
                  v-if="form.controls.password.hasError('minlength') && form.controls.password.touched"
                >
                  <cf-error>Usa al menos 8 caracteres.</cf-error>
                </template>
                <template v-if="form.controls.password.hasError('maxlength')">
                  <cf-error>Usa como maximo 72 caracteres.</cf-error>
                </template>
              </div>
            </cf-form-field>
            <template v-if="errorMessage()">
              <p role="alert" class="form-error">{{ errorMessage() }}</p>
            </template>
            <button
              type="submit"
              :disabled="submitting()"
              class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
            >
              {{ submitting() ? 'Creando cuenta...' : 'Crear cuenta' }}
            </button>
          </form>
        </cf-card-content>
        <cf-card-actions>
          <span>Ya tienes cuenta?</span>
          <a href="/login" class="studio-button-base studio-button cf-button-secondary">Iniciar sesion</a>
        </cf-card-actions>
      </cf-card>
    </section>
  </app-register-page>
</template>

<style scoped lang="scss">
app-register-page {
  display: block;
}
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  align-items: center;
  gap: clamp(24px, 5vw, 70px);
  max-width: 1280px;
  margin: auto;
  padding: clamp(24px, 5vw, 80px);
}
.auth-copy {
  grid-column: 1;
  grid-row: 1;
  padding: 24px 0;
}
.auth-copy h1 {
  max-width: 520px;
  font-size: clamp(36px, 4.5vw, 60px);
  line-height: 1.1;
  letter-spacing: -2px;
  margin: 22px 0;
}
.auth-copy > p:last-child {
  color: var(--cf-muted);
  line-height: 1.85;
  max-width: 440px;
  font-size: 15px;
}
.back-link {
  display: inline-block;
  margin-bottom: 60px;
  font-size: 12px;
  color: var(--cf-primary);
  text-decoration: none;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 800;
  color: var(--cf-primary);
}
.auth-card {
  grid-column: 2;
  grid-row: 1;
  padding: 26px 16px;
  width: 100%;
  border: 1px solid var(--cf-border);
  border-radius: 14px;
  box-shadow: 0 20px 60px #24203d0a;
}
.auth-card cf-card-title {
  font-size: 26px;
  letter-spacing: -1px;
}
.auth-card cf-card-subtitle {
  margin-top: 10px;
  line-height: 1.6;
  color: var(--cf-muted);
}
.auth-form {
  display: grid;
  gap: 8px;
  padding-top: 26px;
}
.auth-form button {
  min-height: 48px;
  margin-top: 8px;
}
.form-error {
  margin: 0 0 12px;
  color: #a52834;
  font-size: 13px;
}
cf-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 22px 16px 0;
  color: var(--cf-muted);
  font-size: 12px;
}
@media (max-width: 1000px) {
  .auth-page {
    grid-template-columns: 1fr;
    max-width: 650px;
    gap: 12px;
  }
  .auth-copy {
    grid-column: 1;
    grid-row: 1;
  }
  .auth-copy h1 {
    font-size: 36px;
  }
  .back-link {
    margin-bottom: 24px;
  }
  .auth-card {
    grid-column: 1;
    grid-row: 2;
    margin-bottom: 20px;
  }
}
</style>
