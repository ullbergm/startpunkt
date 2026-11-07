{{/* Name of the chart, used in labels. */}}
{{- define "startpunkt.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name that every resource name starts with. It comes from the release name, so
it cannot collide with another release or with a 4.x installation.
*/}}
{{- define "startpunkt.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 50 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 50 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 50 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/* Roles deployed in the chosen mode. */}}
{{- define "startpunkt.roles" -}}
{{- if eq .Values.mode "split" -}}
controller api web
{{- else -}}
all
{{- end -}}
{{- end -}}

{{/*
Name of the resources of one role. Takes (dict "root" $ "role" "api").
The single-mode role has no suffix.
*/}}
{{- define "startpunkt.roleName" -}}
{{- $fullname := include "startpunkt.fullname" .root -}}
{{- if eq .role "all" -}}
{{- $fullname -}}
{{- else -}}
{{- printf "%s-%s" $fullname .role -}}
{{- end -}}
{{- end -}}

{{/* Name of the role that serves the given part: "api" or "web". */}}
{{- define "startpunkt.servingRole" -}}
{{- if eq .root.Values.mode "split" -}}
{{- include "startpunkt.roleName" (dict "root" .root "role" .part) -}}
{{- else -}}
{{- include "startpunkt.fullname" .root -}}
{{- end -}}
{{- end -}}

{{/*
Name of the cluster-scoped RBAC objects. It includes the namespace, because
two releases with the same name can exist in different namespaces.
*/}}
{{- define "startpunkt.clusterName" -}}
{{- printf "%s-%s" (include "startpunkt.fullname" .) .Release.Namespace | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "startpunkt.selectorLabels" -}}
app.kubernetes.io/name: {{ include "startpunkt.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .role }}
{{- end -}}

{{- define "startpunkt.commonLabels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/name: {{ include "startpunkt.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "startpunkt.labels" -}}
{{ include "startpunkt.commonLabels" .root }}
app.kubernetes.io/component: {{ .role }}
{{- end -}}

{{/* Whether a role talks to the Kubernetes API. */}}
{{- define "startpunkt.usesKubernetes" -}}
{{- if or (eq . "all") (eq . "controller") -}}true{{- end -}}
{{- end -}}
