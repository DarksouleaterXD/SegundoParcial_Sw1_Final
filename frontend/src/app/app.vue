<script lang="ts">
import { defineComponent } from 'vue';
import { App } from './app';
import { setupView } from './core/view-state';

import { currentRoute } from './core/navigation';
export default defineComponent({
  name: 'AppView',

  setup(props, { emit }) {
    return {
      ...setupView(App, props, emit),

      currentRoute,
    };
  },
});
</script>

<template>
  <a href="#main-content" class="skip-link">Saltar al contenido</a>
  <aside aria-label="Navegación principal" class="app-navigation">
    <a aria-label="Órbita Studio, inicio" href="/" class="brand">
      <span aria-hidden="true" class="brand-mark">◎</span>
      <span>
        <strong>Órbita</strong>
        <small>STUDIO / UML</small>
      </span>
    </a>
    <div class="nav-label">ESPACIO DE TRABAJO</div>
    <nav class="primary-nav">
      <a
        href="/"
        :aria-current="currentRoute('/') ? 'page' : undefined"
        :class="{ active: currentRoute('/') }"
      >
        <span aria-hidden="true" class="material-symbols-rounded">space_dashboard</span>
        Inicio
      </a>
      <template v-if="auth.isAuthenticated()">
        <a
          href="/projects"
          :aria-current="currentRoute('/projects') ? 'page' : undefined"
          :class="{ active: currentRoute('/projects') }"
        >
          <span aria-hidden="true" class="material-symbols-rounded">folder_open</span>
          Proyectos
        </a>
      </template>
      <a
        href="/guide"
        :aria-current="currentRoute('/guide') ? 'page' : undefined"
        :class="{ active: currentRoute('/guide') }"
      >
        <span aria-hidden="true" class="material-symbols-rounded">menu_book</span>
        Guía y despliegue
      </a>
    </nav>
    <div class="nav-footer">
      <div
        role="status"
        :class="{ online: backendOnline() === true, offline: backendOnline() === false }"
        class="backend-status"
      >
        <span aria-hidden="true" class="status-dot"></span>
        {{
          backendOnline() === null
            ? 'Consultando API…'
            : backendOnline()
              ? 'API disponible'
              : 'API sin conexión'
        }}
      </div>
      <template v-if="auth.isAuthenticated()">
        <div class="user-profile">
          <span aria-hidden="true" class="avatar">{{ auth.user()?.displayName?.slice(0, 1) }}</span>
          <span class="user-name">{{ auth.user()?.displayName }}</span>
        </div>
        <button type="button" @click="logout()" class="studio-button-base studio-button">
          Cerrar sesión
        </button>
      </template>
      <template v-else>
        <a href="/login" class="studio-button-base studio-button cf-button-secondary">Iniciar sesión</a>
        <a
          href="/register"
          class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
        >
          Crear cuenta
        </a>
      </template>
    </div>
  </aside>
</template>
