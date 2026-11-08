<script lang="ts">
import { defineComponent } from 'vue';
import { ProjectListPage } from './project-list.page';
import { setupView, formatDate } from '../../../core/view-state';

import { currentRoute, routeHref } from '../../../core/navigation';
export default defineComponent({
  name: 'ProjectListPageView',

  setup(props, { emit }) {
    return {
      ...setupView(ProjectListPage, props, emit),
      formatDate,
      asValue: (target: EventTarget | null) => target as HTMLInputElement,
      currentRoute,
      routeHref,
    };
  },
});
</script>

<template>
  <app-project-list-page class="studio-view">
    <section class="page-shell">
      <header class="page-heading">
        <div>
          <p class="eyebrow">TU ESTUDIO</p>
          <h1>Biblioteca de proyectos</h1>
          <p class="lead">
            Aqui aparecen tus proyectos propios y los que otros propietarios compartan contigo.
          </p>
        </div>
        <a href="/guide" class="studio-button-base studio-button cf-button-secondary">
          Guía de inicio
          <span aria-hidden="true" class="material-symbols-rounded">north_east</span>
        </a>
      </header>
      <div aria-label="Resumen de proyectos" class="library-stats">
        <div>
          <strong>{{ loading() ? '—' : projects().length }}</strong>
          <span>Proyectos</span>
        </div>
        <div>
          <strong>{{ loading() ? '—' : ownedCount() }}</strong>
          <span>Propios</span>
        </div>
        <div>
          <strong>{{ loading() ? '—' : sharedCount() }}</strong>
          <span>Compartidos</span>
        </div>
      </div>
      <div class="projects-layout">
        <cf-card class="create-card studio-card-outlined">
          <cf-card-header>
            <cf-card-title>Nuevo proyecto</cf-card-title>
            <cf-card-subtitle>Ponle nombre a tu próxima idea.</cf-card-subtitle>
          </cf-card-header>
          <cf-card-content>
            <form @submit.prevent="createProject()" novalidate class="create-form">
              <cf-form-field class="studio-field">
                <label class="studio-field-control">
                  <cf-label>Nombre del proyecto</cf-label>
                  <input
                    maxlength="120"
                    autocomplete="off"
                    aria-required="true"
                    placeholder="Ej. Veterinaria"
                    v-model="nameControl.value"
                    @blur="nameControl.markAsTouched()"
                    :aria-invalid="nameControl.invalid && nameControl.touched"
                  />
                </label>
                <div class="studio-field-notes">
                  <template v-if="nameControl.hasError('required') && nameControl.touched">
                    <cf-error>El nombre es obligatorio.</cf-error>
                  </template>
                  <template v-if="nameControl.hasError('maxlength')">
                    <cf-error>Usa como maximo 120 caracteres.</cf-error>
                  </template>
                </div>
              </cf-form-field>
              <button
                type="submit"
                :disabled="creating()"
                class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
              >
                {{ creating() ? 'Creando...' : 'Crear proyecto' }}
              </button>
            </form>
          </cf-card-content>
        </cf-card>
        <section aria-labelledby="project-library-title" class="project-library">
          <div class="section-heading">
            <div>
              <p class="eyebrow">BIBLIOTECA</p>
              <h2 id="project-library-title">Proyectos</h2>
            </div>
            <template v-if="!loading()">
              <span class="project-count">
                {{ projects().length }}
                {{ projects().length === 1 ? 'proyecto' : 'proyectos' }}
              </span>
            </template>
          </div>
          <div class="library-filters">
            <label class="search-field">
              <span aria-hidden="true" class="material-symbols-rounded">search</span>
              <input
                type="search"
                aria-label="Buscar proyectos"
                placeholder="Buscar un proyecto…"
                :value="query()"
                @input="query.set(asValue($event.target).value)"
              />
            </label>
            <div role="group" aria-label="Filtrar proyectos" class="filter-options">
              <button
                type="button"
                :aria-pressed="accessFilter() === 'ALL'"
                @click="accessFilter.set('ALL')"
                :class="{ active: accessFilter() === 'ALL' }"
              >
                Todos
              </button>
              <button
                type="button"
                :aria-pressed="accessFilter() === 'OWNER'"
                @click="accessFilter.set('OWNER')"
                :class="{ active: accessFilter() === 'OWNER' }"
              >
                Propios
              </button>
              <button
                type="button"
                :aria-pressed="accessFilter() === 'EDITOR'"
                @click="accessFilter.set('EDITOR')"
                :class="{ active: accessFilter() === 'EDITOR' }"
              >
                Compartidos
              </button>
            </div>
          </div>
          <template
            v-if="invitationsLoading() || pendingInvitations().length > 0 || invitationErrorMessage()"
          >
            <cf-card class="invitation-inbox studio-card-outlined">
              <cf-card-header>
                <div aria-hidden="true" class="invitation-heading-icon">
                  <span class="material-symbols-rounded">mail</span>
                </div>
                <div>
                  <cf-card-title>Invitaciones pendientes</cf-card-title>
                  <cf-card-subtitle>
                    Proyectos que otros propietarios quieren compartir contigo.
                  </cf-card-subtitle>
                </div>
              </cf-card-header>
              <cf-card-content>
                <template v-if="invitationsLoading()">
                  <div aria-live="polite" class="invitation-loading">
                    <cf-spinner
                      role="progressbar"
                      aria-label="Cargando"
                      style="--spinner-size: 28px"
                      class="studio-spinner"
                    ></cf-spinner>
                    <span>Cargando invitaciones...</span>
                  </div>
                </template>
                <template v-else-if="invitationErrorMessage()">
                  <div role="alert" class="invitation-error">
                    <span>{{ invitationErrorMessage() }}</span>
                    <button
                      type="button"
                      @click="retryInvitations()"
                      class="studio-button-base studio-button cf-button-secondary"
                    >
                      Reintentar
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="invitation-list">
                    <template v-for="(invitation, $index) in pendingInvitations()" :key="invitation.id">
                      <article class="invitation-row">
                        <div class="invitation-copy">
                          <strong>{{ invitation.projectName }}</strong>
                          <span>Invitado por {{ invitation.invitedByDisplayName }}</span>
                          <small>{{ formatDate(invitation.createdAt, 'short') }}</small>
                        </div>
                        <div class="invitation-actions">
                          <button
                            type="button"
                            :disabled="invitationActionId() !== null"
                            @click="acceptInvitation(invitation)"
                            class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">check</span>
                            {{ invitationActionId() === invitation.id ? 'Procesando...' : 'Aceptar' }}
                          </button>
                          <button
                            type="button"
                            :disabled="invitationActionId() !== null"
                            @click="declineInvitation(invitation)"
                            class="studio-button-base studio-button cf-button-secondary"
                          >
                            Rechazar
                          </button>
                        </div>
                      </article>
                    </template>
                  </div>
                </template>
              </cf-card-content>
            </cf-card>
          </template>
          <template v-if="errorMessage()">
            <div role="alert" class="feedback-panel error-panel">
              <p>{{ errorMessage() }}</p>
              <button
                type="button"
                @click="retry()"
                class="studio-button-base studio-button cf-button-secondary"
              >
                Reintentar
              </button>
            </div>
          </template>
          <template v-else-if="loading()">
            <div aria-live="polite" class="feedback-panel loading-panel">
              <cf-spinner
                role="progressbar"
                aria-label="Cargando"
                style="--spinner-size: 36px"
                class="studio-spinner"
              ></cf-spinner>
              <p>Cargando proyectos...</p>
            </div>
          </template>
          <template v-else-if="projects().length === 0">
            <div class="feedback-panel empty-panel">
              <strong>Aun no hay proyectos.</strong>
              <p>
                Crea el primero desde el formulario. El proyecto quedara persistido y listo para recibir el
                modelo UML.
              </p>
            </div>
          </template>
          <template v-else>
            <div class="project-grid">
              <template v-for="(project, $index) in filteredProjects()" :key="project.id">
                <cf-card class="project-card studio-card-outlined">
                  <cf-card-header>
                    <cf-card-title>{{ project.name }}</cf-card-title>
                    <cf-card-subtitle class="project-card-subtitle">
                      <span>Revision {{ project.revision }}</span>
                      <span
                        :class="{ 'is-shared': project.accessRole === 'EDITOR' }"
                        class="project-access-badge"
                      >
                        {{ project.accessRole === 'OWNER' ? 'Propietario' : 'Compartido · Editor' }}
                      </span>
                    </cf-card-subtitle>
                  </cf-card-header>
                  <cf-card-content>
                    <dl class="project-meta">
                      <div>
                        <dt>Modelo</dt>
                        <dd>
                          {{ project.document.umlModel.classes.length }} clases ·
                          {{ project.document.umlModel.relationships.length }} relaciones
                        </dd>
                      </div>
                      <div>
                        <dt>Actualizado</dt>
                        <dd>{{ formatDate(project.updatedAt, 'medium') }}</dd>
                      </div>
                    </dl>
                  </cf-card-content>
                  <cf-card-actions align="end">
                    <a
                      :href="routeHref(['/projects', project.id])"
                      class="studio-button-base studio-button cf-button-secondary"
                    >
                      Abrir proyecto
                    </a>
                  </cf-card-actions>
                </cf-card>
              </template>
              <template v-if="!filteredProjects()?.length">
                <div class="feedback-panel">
                  <strong>No hay coincidencias</strong>
                  <p>Prueba otro nombre o filtro.</p>
                </div>
              </template>
            </div>
          </template>
        </section>
      </div>
    </section>
  </app-project-list-page>
</template>

<style scoped lang="scss" src="./project-list.page.scss"></style>
