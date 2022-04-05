FROM python:3.10

# Install git
RUN curl -sL https://deb.nodesource.com/setup_17.x | bash -
RUN apt-get update \
&& apt-get install -yq \
    git \
    nodejs \
    libgbm-dev \
    libnss3 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxtst6 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    libdrm2 \
&& apt-get upgrade -yq \
&& rm -rf /var/lib/apt/lists/*

# Get the API
RUN pip install git+https://github.com/dosepix/dpx-control-api.git

# Get the control software
RUN pip install git+https://github.com/dosepix/dpx_control_hw.git

# Change and copy to workdir
WORKDIR /app
COPY . .

# Add group and user node
RUN groupadd -r node \
&& useradd -r -g node node
RUN chown -R node /app

# Install gui
USER node
RUN npm install

# Electron needs root for sandbox
USER root
RUN chown root /app/node_modules/electron/dist/chrome-sandbox
RUN chmod 4755 /app/node_modules/electron/dist/chrome-sandbox

USER node
EXPOSE 4001
CMD npm start
