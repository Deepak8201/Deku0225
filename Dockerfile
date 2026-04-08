ARG RUNNER_IMAGE
FROM ${RUNNER_IMAGE}

ENV TESTS_DIR=/tmp/clone

USER root
RUN mkdir -p "$TESTS_DIR" && \
    chown -R runner:runner "$TESTS_DIR"
COPY --chown=runner:runner . "$TESTS_DIR"
# Sonar/docker: strip group/other write on copied tree; owner (runner) keeps write for reports/temp under the clone
RUN chmod -R go-w "$TESTS_DIR"
USER runner
