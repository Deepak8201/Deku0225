ARG RUNNER_IMAGE
FROM ${RUNNER_IMAGE}

ENV TESTS_DIR=/tmp/clone

USER root
RUN mkdir -p "$TESTS_DIR" && \
    chown -R runner:runner "$TESTS_DIR"
# Copy test files recursively - sensitive files (.env, .git, credentials, etc.) excluded via .dockerignore
COPY --chown=runner:runner . "$TESTS_DIR"
# Sonar/docker: explicitly set permissions - files 644 (rw-r--r--), directories 755 (rwxr-xr-x)
RUN find "$TESTS_DIR" -type f -exec chmod 644 {} \; && \
    find "$TESTS_DIR" -type d -exec chmod 755 {} \;
USER runner
